import { inspect } from 'node:util';
import type { Page } from 'patchright';

inspect.defaultOptions.depth = null;

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
      events: { count: number; edges: { node: MeetupApiEvent }[] };
    };
  };
};

export function unescapeMarkdown(markdown: string): string {
  return markdown.replace(/\\+([*-_])/g, '$1');
}

export function prepareLocation(venue?: MeetupApiEvent['venue'], separator = ', '): string {
  if (!venue) return '';
  const location = ['name', 'address', 'city'].reduce(
    (acc, part) => (part in venue ? acc.add(venue[part]) : acc),
    new Set<string>()
  );
  return [...location].join(separator);
}

export async function readEvents(
  page: Page,
  type: 'upcoming' | 'past',
  group: string,
  limit = 999
): Promise<EventData[]> {
  // skip if limit is zero
  if (limit === 0) return [];

  // navigate to the events page
  await page.goto(`/${group}/events/?type=${type}`);

  // prepare graphql query
  const status = type === 'upcoming' ? 'ACTIVE' : 'PAST';
  const dateFilter = type === 'upcoming' ? 'afterDateTime' : 'beforeDateTime';
  const dateNow = new Date().toISOString();
  const query = `
    query ($urlname: String!) {
      groupByUrlname(urlname: $urlname) {
        events(first: ${limit}, status: ${status}, filter: { ${dateFilter}: "${dateNow}" }) {
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
  const response = await page.request.post('/gql2', { data: payload });

  // check if response is valid
  const { data } = (await response.json()) as MeetupApiResponse;
  if (!data?.groupByUrlname?.events?.edges.length) return [];

  // map results
  return data.groupByUrlname.events.edges
    .map(({ node }) => node)
    .map(({ id, dateTime, description, eventUrl: link, title, venue }) => {
      return {
        id,
        date: new Date(dateTime).toISOString(),
        description: unescapeMarkdown(description),
        location: prepareLocation(venue),
        link,
        title,
      };
    });
}
