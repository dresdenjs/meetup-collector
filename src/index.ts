#!/usr/bin/env -S node --experimental-modules --no-warnings

import { parseArgs } from 'node:util';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import { readEvents as readEventsHtml } from './from-browser.js';
import { readEvents as readEventsApi } from './from-api.js';
import { login } from './login.js';
import { storeEvents } from './store-mdx.js';
import { pickNumber, pickRandom } from './randomize.utils.js';

// read environment variables
const {
  // credentials must be set as env vars
  USERNAME,
  PASSWORD,

  // convenience variables, can be set as args as well
  BASE_URL = 'https://www.meetup.com/',
  GROUP_SLUG = 'dresdenjs-io-javascript-user-group',

  // the file name pattern with optional placeholders from the event data
  // - {id} the event id
  // - {date} date as JSON string
  // - {day} day as short date string
  FILE_NAME = '%day%-meetup.md',

  // where to store the generated files
  TARGET = './dist',

  // limit the amount of items to be collected
  LIMIT_PAST,
  LIMIT_UPCOMING,
} = process.env;

if (!USERNAME || !PASSWORD) {
  console.error('Missing credentials');
  process.exit(1);
}

// read program arguments
const { values } = parseArgs({
  options: {
    baseURL: { type: 'string', alias: 'b', default: BASE_URL },
    groupSlug: { type: 'string', alias: 'g', default: GROUP_SLUG },
    limitPast: { type: 'string', alias: 'p', default: LIMIT_PAST },
    limitUpcoming: { type: 'string', alias: 'u', default: LIMIT_UPCOMING },
    fileName: { type: 'string', alias: 'f', default: FILE_NAME },
    target: { type: 'string', alias: 't', default: TARGET },
    noApi: { type: 'boolean', default: false },
  },
});

const {
  baseURL = BASE_URL,
  groupSlug = GROUP_SLUG,
  limitPast = LIMIT_PAST,
  limitUpcoming = LIMIT_UPCOMING,
  fileName = FILE_NAME,
  target = TARGET,
  noApi = false,
} = values;

// randomize some values
// https://scrapingant.com/blog/bypass-captcha-playwright
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
];
const userAgent = pickRandom(userAgents);
const hwConcurrency = pickNumber(2, 16);
const height = pickNumber(768, 1080);
const width = pickNumber(1024, 1920);
const viewport = { height, width };

// setup browser and context
chromium.use(StealthPlugin());
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ baseURL, userAgent, viewport });

// abort image requests
await context.route('**.jpg*', (route) => route.abort());

// set random hardware concurrency
const page = await context.newPage();
await page.evaluate(`Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${hwConcurrency} })`);

// login first
await login(page, USERNAME, PASSWORD);

// gather upcoming events
const readEvents = noApi ? readEventsHtml : readEventsApi;
const upcoming = await readEvents(page, 'upcoming', groupSlug, limitUpcoming ? Number(limitUpcoming) : undefined);
console.log(`> found ${upcoming.length} upcoming events`);

// gather past events
const past = await readEvents(page, 'past', groupSlug, limitPast ? Number(limitPast) : undefined);
console.log(`> found ${past.length} past events`);

// save to markdown files
await storeEvents([...upcoming, ...past], target, fileName);

// teardown
await page.close();
await context.close();
await browser.close();
