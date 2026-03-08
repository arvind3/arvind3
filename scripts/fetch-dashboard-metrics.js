#!/usr/bin/env node
/**
 * fetch-dashboard-metrics.js
 * Fetches latest metrics from the brand analytics Cloudflare Worker / GitHub Pages data.
 * Outputs a markdown snippet for injection into README.md.
 *
 * Falls back gracefully if the endpoint is unavailable — injects a "data unavailable" note
 * rather than crashing the workflow.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DASHBOARD_DATA_URL =
  'https://raw.githubusercontent.com/arvind3/brand-analytics-automation/main/dashboard-data.json';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'arvind3-readme-bot/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

async function main() {
  let markdown;

  try {
    const { status, body } = await get(DASHBOARD_DATA_URL);

    if (status !== 200) throw new Error(`HTTP ${status}`);

    const data = JSON.parse(body);

    const topRepos = (data.repos || [])
      .sort((a, b) => (b.pageviews || 0) - (a.pageviews || 0))
      .slice(0, 5);

    const totalPageviews = (data.repos || []).reduce((s, r) => s + (r.pageviews || 0), 0);
    const totalSessions  = (data.repos || []).reduce((s, r) => s + (r.sessions  || 0), 0);
    const lastUpdated    = data.lastUpdated || new Date().toISOString().slice(0, 10);

    let table = '';
    if (topRepos.length > 0) {
      table = '\n| Repo | Pageviews | Sessions |\n|---|---|---|\n';
      table += topRepos
        .map(r => `| [${r.name}](https://github.com/arvind3/${r.name}) | ${(r.pageviews || 0).toLocaleString()} | ${(r.sessions || 0).toLocaleString()} |`)
        .join('\n');
    }

    markdown = `> **Dashboard snapshot** (as of ${lastUpdated}): **${totalPageviews.toLocaleString()} total pageviews** across **${totalSessions.toLocaleString()} sessions** — [full dashboard →](https://arvind3.github.io/brand-analytics-dashboard/)
${table}`;
  } catch (err) {
    console.warn(`[fetch-dashboard-metrics] Could not fetch data: ${err.message}`);
    markdown = `> Dashboard data temporarily unavailable — [view live dashboard →](https://arvind3.github.io/brand-analytics-dashboard/)`;
  }

  // Write to a temp file for inject-readme.js to pick up
  const out = join(__dirname, '..', '.cache', 'metrics.md');
  const { mkdirSync, writeFileSync } = await import('fs');
  mkdirSync(join(__dirname, '..', '.cache'), { recursive: true });
  writeFileSync(out, markdown, 'utf8');
  console.log('[fetch-dashboard-metrics] Written to .cache/metrics.md');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
