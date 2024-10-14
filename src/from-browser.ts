import type { BrowserContext } from 'playwright-chromium';
import { NodeHtmlMarkdown } from 'node-html-markdown';

export async function readEvents(
  context: BrowserContext,
  type: 'upcoming' | 'past',
  group: string,
  limit?: number,
): Promise<EventData[]> {
  const page = await context.newPage();
  await page.goto(`/${group}/events/${type}/`);
  let items = await page.locator('ul.eventList-list li.list-item').all();

  if (limit !== undefined && limit < items.length) {
    items = items.slice(0, limit);
  }

  return Promise.all(
    items.map(async (item) => {
      const heading = item.locator('h2 a.eventCardHead--title');
      const title = await heading.innerText();

      const href = await heading.getAttribute('href');
      const url = new URL(href, page.url());
      const link = `${url.origin}${url.pathname}`;
      const id = link.split('/').pop();

      const timestamp = await item.locator('h3 .eventTimeDisplay time').getAttribute('datetime');
      const date = new Date(Number(timestamp)).toISOString();

      const location = await item.locator('.venueDisplay address p').innerText();

      const detailPage = await page.context().newPage();
      await detailPage.goto(link);
      const details = await detailPage.locator('main .break-words').first().innerHTML();
      const description = NodeHtmlMarkdown.translate(details);
      await detailPage.close();

      return { id, date, description, link, location, title };
    }),
  );
}
