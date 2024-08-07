import { inspect } from 'node:util';
import type { BrowserContext } from 'playwright-chromium';
import { NodeHtmlMarkdown } from 'node-html-markdown';

inspect.defaultOptions.depth = null;

const markdown = new NodeHtmlMarkdown();

export type MeetupApiEvent = {
  id: string;
  dateTime: string;
  description: string;
  eventUrl: string;
  title: string;
  venue: {
    name: string;
    address: string;
    city: string;
  } | null;
};

export type MeetupApiResponse = {
  data: {
    groupByUrlname: {
      [key in 'upcomingEvents' | 'pastEvents']: { count: number; edges: { node: MeetupApiEvent }[] };
    };
  };
};

export function prepareLocation(venue?: MeetupApiEvent['venue'], separator = ', '): string {
  if (!venue) return '';
  const location = ['name', 'address', 'city'].reduce(
    (acc, part) => (part in venue ? acc.add(venue[part]) : acc),
    new Set<string>(),
  );
  return [...location].join(separator);
}

export async function readEvents(
  context: BrowserContext,
  type: 'upcoming' | 'past',
  group: string,
  limit = 999,
): Promise<EventData[]> {
  // skip if limit is zero
  if (limit === 0) return [];

  // create a new page
  const page = await context.newPage();
  await page.goto(`/${group}/events/${type}`);

  // prepare api request function
  const operationName = type === 'upcoming' ? 'upcomingEvents' : 'pastEvents';
  const query = `
    query ($urlname: String!) {
      groupByUrlname(urlname: $urlname) {
        ${operationName}(input: { first: ${limit} }) {
          count
          edges {
            node {
              id
              dateTime
              description
              eventUrl
              title
              venue {
                name
                address
                city
              }
            }
          }
        }
      }
    }
  `;
  const payload = { query, variables: { urlname: group } };

  // do actual request
  // (endpoint:microtarget/nwp,meta:(method:get,noCache:!t),params:(group_urlname:DresdenJS-io-JavaScript-User-Group),ref:microtarget)
  // (endpoint:dresdenjs-io-javascript-user-group/events,list:(dynamicRef:list_events_dresdenjs-io-javascript-user-group_past_cancelled,merge:()),meta:(method:get),params:(desc:true,fields:'attendance_count,comment_count,event_hosts,featured_photo,plain_text_no_images_description,series,self,rsvp_rules,rsvp_sample,venue,venue_visibility,pro_network_event',has_ended:true,page:'10',scroll:'since:2022-07-15T01:00:00.000+02:00',status:'upcoming,past,cancelled'),ref:events_dresdenjs-io-javascript-user-group_past_cancelled)
  // (endpoint:dresdenjs-io-javascript-user-group/events,list:(dynamicRef:list_events_dresdenjs-io-javascript-user-group_past_cancelled,merge:()),meta:(method:get),params:(desc:true,fields:'attendance_count,comment_count,event_hosts,featured_photo,plain_text_no_images_description,series,self,rsvp_rules,rsvp_sample,venue,venue_visibility,pro_network_event',has_ended:true,page:'10',scroll:'since:2015-12-11T01:00:00.000+01:00',status:'upcoming,past,cancelled'),ref:events_dresdenjs-io-javascript-user-group_past_cancelled)
  const response = await page.request.post('/gql', { data: payload });

  // check if response is valid
  const { data } = (await response.json()) as MeetupApiResponse;
  if (!data.groupByUrlname?.[operationName]?.edges.length) return [];

  // map results
  return data.groupByUrlname[operationName].edges
    .map(({ node }) => node)
    .map(({ id, dateTime, description, eventUrl: link, title, venue }) => ({
      id,
      date: new Date(dateTime).toISOString(),
      description: markdown.translate(description),
      location: prepareLocation(venue),
      link,
      title,
    }));
}
