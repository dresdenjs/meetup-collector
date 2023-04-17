import { parseArgs } from 'node:util';
import { chromium } from 'playwright-chromium';
import { readEvents } from './gather-infos.js';
import { login } from './login.js';
import { storeEvents } from './store-mdx.js';

// read environment variables
const {
  MEETUP_USERNAME,
  MEETUP_PASSWORD,
  MEETUP_BASE_URL = 'https://www.meetup.com/',
  MEETUP_GROUP_SLUG = 'dresdenjs-io-javascript-user-group',
} = process.env;

if (!MEETUP_USERNAME || !MEETUP_PASSWORD) {
  console.error('Missing credentials');
  process.exit(1);
}

// read program arguments
const { values } = parseArgs({
  options: {
    target: { type: 'string', alias: 't', default: './dist' },
    limitPast: { type: 'string', alias: 'p', default: '20' },
    limitUpcoming: { type: 'string', alias: 'u', default: '3' },
  },
});
const { target = './dist', limitPast = '20', limitUpcoming = '3' } = values;

// setup browser and context
const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: MEETUP_BASE_URL,
});
await context.route('**.jpg', (route) => route.abort());

// login first
await login(context, MEETUP_USERNAME, MEETUP_PASSWORD);

// gather upcoming and past events
const upcoming = await readEvents(
  context,
  MEETUP_GROUP_SLUG,
  'upcoming',
  Number(limitUpcoming)
);
const past = await readEvents(
  context,
  MEETUP_GROUP_SLUG,
  'past',
  Number(limitPast)
);

// save to markdown files
await storeEvents([...upcoming, ...past], target);

// teardown
await context.close();
await browser.close();
