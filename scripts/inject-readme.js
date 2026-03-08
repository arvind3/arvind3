#!/usr/bin/env node
/**
 * inject-readme.js
 * Reads .cache/{metrics,repos,activity}.md and injects content into README.md
 * between the <!-- DYNAMIC:*:START --> and <!-- DYNAMIC:*:END --> marker pairs.
 * Also updates the <!-- DYNAMIC:TIMESTAMP --> marker.
 *
 * Idempotent — safe to run multiple times.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function readCache(name) {
  const p = join(ROOT, '.cache', `${name}.md`);
  if (!existsSync(p)) {
    console.warn(`[inject-readme] .cache/${name}.md not found — skipping`);
    return null;
  }
  return readFileSync(p, 'utf8').trim();
}

function inject(content, marker, replacement) {
  const startTag = `<!-- DYNAMIC:${marker}:START -->`;
  const endTag   = `<!-- DYNAMIC:${marker}:END -->`;
  const startIdx = content.indexOf(startTag);
  const endIdx   = content.indexOf(endTag);

  if (startIdx === -1 || endIdx === -1) {
    console.warn(`[inject-readme] Markers for ${marker} not found — skipping`);
    return content;
  }

  const before = content.slice(0, startIdx + startTag.length);
  const after  = content.slice(endIdx);
  return `${before}\n${replacement}\n${after}`;
}

function injectTimestamp(content, timestamp) {
  return content.replace(
    /<!-- DYNAMIC:TIMESTAMP -->.*?<!-- \/DYNAMIC:TIMESTAMP -->/s,
    `<!-- DYNAMIC:TIMESTAMP -->${timestamp}<!-- /DYNAMIC:TIMESTAMP -->`
  );
}

async function main() {
  const readmePath = join(ROOT, 'README.md');
  let readme = readFileSync(readmePath, 'utf8');

  const metrics  = readCache('metrics');
  const repos    = readCache('repos');
  const activity = readCache('activity');

  if (metrics)  readme = inject(readme, 'METRICS',  metrics);
  if (repos)    readme = inject(readme, 'REPOS',    repos);
  if (activity) readme = inject(readme, 'ACTIVITY', activity);

  const timestamp = new Date().toISOString().slice(0, 10);
  readme = injectTimestamp(readme, timestamp);

  writeFileSync(readmePath, readme, 'utf8');
  console.log(`[inject-readme] README.md updated (timestamp: ${timestamp})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
