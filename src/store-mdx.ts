import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import matter from 'gray-matter';

export function escapeFrontmatter(str: string): string {
  return str.replace(/'/g, "''");
}

export async function storeEvent(
  event: EventData,
  target: string
): Promise<void> {
  const date = event.date.slice(0, 10);
  const file = `${date}-meetup.md`;
  const path = `${target}/${file}`;
  const content = `---
date: '${event.date}'
link: '${event.link}'
location: '${escapeFrontmatter(event.location)}'
title: '${escapeFrontmatter(event.title)}'
locked: false
---
${event.description}
`;
  // check if we're allowed to overwrite
  if (existsSync(path)) {
    const content = await readFile(path);
    const { data } = matter(content.toString());
    if (data.locked) {
      console.log(`> skipping ${file} because it alrady exists and is locked`);
      return;
    } else {
      console.log(`> overwriting ${file} because it already exists`);
    }
  } else {
    console.log(`> creating ${file}`);
  }

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
