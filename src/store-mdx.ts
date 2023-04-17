import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function storeEvent(
  event: EventData,
  target: string
): Promise<void> {
  const date = event.date.slice(0, 10);
  const path = `${target}/${date}-meetup.mdx`;
  const content = `---
date: '${event.date}'
link: '${event.link}'
location: '${event.location}'
title: '${event.title}'
locked: false
---
${event.description}
`;
  writeFile(path, content, { encoding: 'utf-8' });
}

export async function storeEvents(
  events: EventData[],
  target: string
): Promise<void> {
  const basePath = resolve(process.cwd(), target);
  if (!existsSync(basePath)) {
    await mkdir(basePath, { recursive: true });
  }
  await Promise.allSettled(events.map((event) => storeEvent(event, basePath)));
}
