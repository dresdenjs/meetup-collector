#!/usr/bin/env -S node --experimental-modules --no-warnings

import { parseArgs } from 'node:util';
import { chromium } from 'patchright';

import { readEvents as readEventsHtml } from './from-browser.js';
import { readEvents as readEventsApi } from './from-api.js';
import { login } from './login.js';
import { storeEvents } from './store-mdx.js';
import { pickNumber, pickRandom } from './utils/randomize.utils.js';

// read environment variables
const {
  // credentials must be set as env vars
  USERNAME,
  PASSWORD,

  // browse headed
  DEBUG = undefined,
  // scrape html instead of using api
  NO_API = undefined,

  // convenience variables, can be set as args as well
  BASE_URL = 'https://www.meetup.com/',
  GROUP_SLUG = undefined,

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
    debug: { type: 'boolean', default: !!DEBUG },
    groupSlug: { type: 'string', alias: 'g', default: GROUP_SLUG },
    limitPast: { type: 'string', alias: 'p', default: LIMIT_PAST },
    limitUpcoming: { type: 'string', alias: 'u', default: LIMIT_UPCOMING },
    fileName: { type: 'string', alias: 'f', default: FILE_NAME },
    target: { type: 'string', alias: 't', default: TARGET },
    noApi: { type: 'boolean', default: !!NO_API },
  },
});

// check required variables
if (!GROUP_SLUG) {
  console.error('Error: GROUP_SLUG is not set. Please provide the slug of the Meetup group.');
  process.exit(1);
}

// deprecated non-api usage
if (NO_API) {
  console.warn('Warning: NO_API is deprecated.');
}

// TODO: do we have to align the defaults here again, what about the defaults of `parseArgs`?
const {
  baseURL = BASE_URL,
  debug = DEBUG,
  groupSlug = GROUP_SLUG,
  limitPast = LIMIT_PAST,
  limitUpcoming = LIMIT_UPCOMING,
  fileName = FILE_NAME,
  target = TARGET,
  noApi = NO_API,
} = values;

// setup browser and context
const browser = await chromium.launch({ headless: !debug });
const context = await browser.newContext({ baseURL });

// abort image requests
await context.route('**.jpg*', (route) => route.abort());


// login first
await login(page, USERNAME, PASSWORD);
// gather upcoming events
const page = await context.newPage();
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
