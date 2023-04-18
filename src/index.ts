#!/usr/bin/env -S node --experimental-modules --no-warnings

import { parseArgs } from 'node:util';
import { chromium } from 'playwright-chromium';
import { readEvents } from './gather-infos.js';
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
  LIMIT_PAST = '20',
  LIMIT_UPCOMING = '3',
  TARGET = './dist',
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
    limitPast: { type: 'string', alias: 'p', default: LIMIT_PAST },
    limitUpcoming: { type: 'string', alias: 'u', default: LIMIT_UPCOMING },
    target: { type: 'string', alias: 't', default: TARGET },
  },
});
const {
  baseUrl = BASE_URL,
  groupSlug = GROUP_SLUG,
  limitPast = LIMIT_PAST,
  limitUpcoming = LIMIT_UPCOMING,
  target = TARGET,
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
const upcoming = await readEvents(
  context,
  groupSlug,
  'upcoming',
  Number(limitUpcoming)
);
const past = await readEvents(context, groupSlug, 'past', Number(limitPast));

// save to markdown files
await storeEvents([...upcoming, ...past], target);

// teardown
await context.close();
await browser.close();
