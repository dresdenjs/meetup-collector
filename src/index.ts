#!/usr/bin/env -S node --experimental-modules --no-warnings

import { parseArgs } from 'node:util';
import { chromium } from 'playwright-chromium';
import { readEvents as readEventsHtml } from './from-browser.js';
import { readEvents as readEventsApi } from './from-api.js';
import { login } from './login.js';
import { storeEvents } from './store-mdx.js';

// read environment variables
const {
  // credentials must be set as env vars
  USERNAME,
  PASSWORD,

  // convenience variables, can be set as args as well
  BASE_URL = 'https://www.meetup.com/',
  GROUP_SLUG = 'dresdenjs-io-javascript-user-group',
  GROUP_NAME = 'DresdenJS.io JavaScript User Group',

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
    baseUrl: { type: 'string', alias: 'b', default: BASE_URL },
    groupSlug: { type: 'string', alias: 'g', default: GROUP_SLUG },
    groupName: { type: 'string', alias: 'n', default: GROUP_NAME },
    limitPast: { type: 'string', alias: 'p', default: LIMIT_PAST },
    limitUpcoming: { type: 'string', alias: 'u', default: LIMIT_UPCOMING },
    target: { type: 'string', alias: 't', default: TARGET },
    api: { type: 'boolean', default: true },
  },
});
const {
  baseUrl = BASE_URL,
  groupSlug = GROUP_SLUG,
  groupName = GROUP_NAME,
  limitPast = LIMIT_PAST,
  limitUpcoming = LIMIT_UPCOMING,
  target = TARGET,
  api = true,
} = values;

// setup browser and context
const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: baseUrl,
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
});
await context.route('**.jpg*', (route) => route.abort());

// login first
await login(context, USERNAME, PASSWORD);

// gather upcoming and past events
const readEvents = api ? readEventsApi : readEventsHtml;
const upcoming = await readEvents(
  context,
  'upcoming',
  groupSlug,
  groupName,
  limitUpcoming ? Number(limitUpcoming) : undefined
);
console.log(`> found ${upcoming.length} upcoming events`);
const past = await readEvents(
  context,
  'past',
  groupSlug,
  groupName,
  limitPast ? Number(limitPast) : undefined
);
console.log(`> found ${past.length} past events`);

// save to markdown files
await storeEvents([...upcoming, ...past], target);

// teardown
await context.close();
await browser.close();
