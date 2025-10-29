#!/usr/bin/env -S node --experimental-modules --no-warnings

import { env } from 'node:process';
import { parseArgs } from 'node:util';
import { chromium } from 'patchright';

import { readEvents as readEventsHtml } from './from-browser.js';
import { readEvents as readEventsApi } from './from-api.js';
import { storeEvents } from './store-mdx.js';

// read environment variables
const {
  // browse headed
  DEBUG = undefined,
  // deprecated - scrape html instead of using api
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
} = env;

// read program arguments
const {
  values: { baseURL, debug, groupSlug, limitPast, limitUpcoming, fileName, target, noApi },
} = parseArgs({
  options: {
    baseURL: { type: 'string', alias: 'b', default: BASE_URL },
    debug: { type: 'boolean', default: Boolean(DEBUG) },
    groupSlug: { type: 'string', alias: 'g', default: GROUP_SLUG },
    limitPast: { type: 'string', alias: 'p', default: LIMIT_PAST },
    limitUpcoming: { type: 'string', alias: 'u', default: LIMIT_UPCOMING },
    fileName: { type: 'string', alias: 'f', default: FILE_NAME },
    target: { type: 'string', alias: 't', default: TARGET },
    noApi: { type: 'boolean', default: Boolean(NO_API) },
  },
});

// check required variables
if (!groupSlug) {
  console.error('Error: GROUP_SLUG is not set. Please provide the slug of the Meetup group.');
  process.exit(1);
}

// deprecated non-api usage
if (noApi) {
  console.warn('Warning: NO_API is deprecated.');
}

// setup browser and context
const browser = await chromium.launch({ headless: !debug });
const context = await browser.newContext({ baseURL });

// abort image requests
await context.route('**.jpg*', (route) => route.abort());

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
