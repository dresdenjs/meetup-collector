import type { BrowserContext } from 'playwright-chromium';

export async function readEvents(
  context: BrowserContext,
  group: string,
  type: 'upcoming' | 'past',
  limit?: number
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
      const link = new URL(href, page.url()).toString();

      const timestamp = await item
        .locator('h3 .eventTimeDisplay time')
        .getAttribute('datetime');
      const date = new Date(Number(timestamp)).toISOString();

      const location = await item
        .locator('.venueDisplay address p')
        .innerText();

      const detailPage = await page.context().newPage();
      await detailPage.goto(link);
      const description = await detailPage
        .locator('main .break-words')
        .first()
        .innerHTML();
      await detailPage.close();

      return { date, description, link, location, title };
    })
  );
}
