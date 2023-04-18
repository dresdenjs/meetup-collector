import type { BrowserContext } from 'playwright-chromium';
import { NodeHtmlMarkdown } from 'node-html-markdown';

const markdown = new NodeHtmlMarkdown();

export type MeetupApiEvent = {
  created: number; // timestamp
  id: string;
  name: string;
  date_in_series_pattern: boolean;
  status: 'cancelled' | 'past' | 'upcoming';
  time: number;
  local_date: string;
  local_time: string;
  updated: number;
  utc_offset: number;
  waitlist_count: number;
  yes_rsvp_count: number;
  venue?: {
    id: number;
    name: string;
    lat: number;
    lon: number;
    repinned: boolean;
    address_1: string;
    city: string;
    country: string;
    localized_country_name: string;
  };
  is_online_event: boolean;
  group: {
    created: number;
    name: string;
    id: number;
    join_mode: 'open'; // what else?
    lat: number;
    lon: number;
    urlname: string;
    who: string;
    localized_location: string;
    state: string;
    country: string;
    region: string;
    timezone: string;
  };
  link: string;
  description: string;
  how_to_find_us: string;
  visibility: 'public'; // what else?
  member_pay_fee: boolean;
  plain_text_no_images_description: string;
  venue_visibility: 'public'; // what else?
};

export type MeetupApiResponse = {
  responses?: { value?: MeetupApiEvent[] }[];
};

export async function readEvents(
  context: BrowserContext,
  type: 'upcoming' | 'past',
  group: string,
  name: string,
  limit?: number
): Promise<EventData[]> {
  // create a new page
  const page = await context.newPage();
  await page.goto(`/${group}/events/${type}`);

  // prepare api request function
  const slug = name.replace(/[\s\.]+/g, '-');
  const hasEnded = type === 'past' ? 'true' : 'false';
  const get = async (query: string) =>
    page.request.get(
      `/mu_api/urlname/events/${type}?queries=${encodeURIComponent(query)}`
    );

  // do actual request
  // (endpoint:microtarget/nwp,meta:(method:get,noCache:!t),params:(group_urlname:DresdenJS-io-JavaScript-User-Group),ref:microtarget)
  // (endpoint:dresdenjs-io-javascript-user-group/events,list:(dynamicRef:list_events_dresdenjs-io-javascript-user-group_past_cancelled,merge:()),meta:(method:get),params:(desc:true,fields:'attendance_count,comment_count,event_hosts,featured_photo,plain_text_no_images_description,series,self,rsvp_rules,rsvp_sample,venue,venue_visibility,pro_network_event',has_ended:true,page:'10',scroll:'since:2022-07-15T01:00:00.000+02:00',status:'upcoming,past,cancelled'),ref:events_dresdenjs-io-javascript-user-group_past_cancelled)
  // (endpoint:dresdenjs-io-javascript-user-group/events,list:(dynamicRef:list_events_dresdenjs-io-javascript-user-group_past_cancelled,merge:()),meta:(method:get),params:(desc:true,fields:'attendance_count,comment_count,event_hosts,featured_photo,plain_text_no_images_description,series,self,rsvp_rules,rsvp_sample,venue,venue_visibility,pro_network_event',has_ended:true,page:'10',scroll:'since:2015-12-11T01:00:00.000+01:00',status:'upcoming,past,cancelled'),ref:events_dresdenjs-io-javascript-user-group_past_cancelled)
  await get(
    `(endpoint:microtarget/nwp,meta:(method:get,noCache:!t),params:(group_urlname:${slug}),ref:microtarget)`
  );
  const response = await get(
    `(endpoint:${group}/events,list:(dynamicRef:list_events_${group}_${type}_cancelled,merge:()),meta:(method:get),params:(desc:true,fields:'plain_text_no_images_description,description,venue,venue_visibility',has_ended:${hasEnded},count:2,status:'${type},cancelled'),ref:events_${group}_${type}_cancelled)`
  );

  // check if response is valid
  const data = (await response.json()) as MeetupApiResponse;
  if (!data.responses?.[0].value?.length) return [];

  // apply limits (not sure how to do this in the query)
  let events = data.responses[0].value;
  if (events.length > limit) {
    events = events.reverse().slice(0, limit);
  }

  // map results
  return events.map(({ time, description, link, name: title, venue }) => ({
    date: new Date(time).toISOString(),
    description: markdown.translate(description),
    location: venue ? `${venue.name}, ${venue.address_1}, ${venue.city}` : '',
    link,
    title,
  }));
}
