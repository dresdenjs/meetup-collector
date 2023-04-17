import { parseArgs } from 'node:util';
import { chromium } from 'playwright-chromium';
import { readEvents } from './gather-infos.js';
import { login } from './login.js';
import { storeEvents } from './store-mdx.js';

// read environment variables
const {
  USERNAME,
  PASSWORD,
  BASE_URL = 'https://www.meetup.com/',
} = process.env;

if (!USERNAME || !PASSWORD) {
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
  baseURL: BASE_URL,
});
await context.route('**.jpg', (route) => route.abort());

// login first
await login(context, USERNAME, PASSWORD);

// gather upcoming and past events
const upcoming = await readEvents(context, 'upcoming', Number(limitUpcoming));
const past = await readEvents(context, 'past', Number(limitPast));

// save to markdown files
await storeEvents([...upcoming, ...past], target);

// teardown
await context.close();
await browser.close();
