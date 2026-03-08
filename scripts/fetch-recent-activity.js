#!/usr/bin/env node
/**
 * fetch-recent-activity.js
 * Fetches the last 5 public events for arvind3 via the GitHub Events API.
 * Formats them as a markdown list for injection into README.md.
 */

import https from 'https';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.METRICS_TOKEN || '';
const USERNAME = 'arvind3';
const LIMIT = 5;

function get(url) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'arvind3-readme-bot/1.0',
      'Accept': 'application/vnd.github+json',
    };
    if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

    https.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

function formatEvent(event) {
  const repo = event.repo?.name || '';
  const repoUrl = `https://github.com/${repo}`;
  const date = new Date(event.created_at).toISOString().slice(0, 10);

  switch (event.type) {
    case 'PushEvent': {
      const count = event.payload?.commits?.length || 0;
      const msg = event.payload?.commits?.[0]?.message?.split('\n')[0]?.slice(0, 72) || '';
      return `🔨 **${date}** Pushed ${count} commit${count !== 1 ? 's' : ''} to [${repo}](${repoUrl})${msg ? ` — _${msg}_` : ''}`;
    }
    case 'CreateEvent': {
      const ref = event.payload?.ref_type === 'branch'
        ? `branch \`${event.payload.ref}\``
        : event.payload?.ref_type || 'ref';
      return `🌿 **${date}** Created ${ref} in [${repo}](${repoUrl})`;
    }
    case 'PullRequestEvent': {
      const action = event.payload?.action || 'updated';
      const title  = event.payload?.pull_request?.title?.slice(0, 72) || '';
      const prUrl  = event.payload?.pull_request?.html_url || repoUrl;
      return `🔀 **${date}** ${action.charAt(0).toUpperCase() + action.slice(1)} PR in [${repo}](${repoUrl})${title ? ` — [${title}](${prUrl})` : ''}`;
    }
    case 'IssuesEvent': {
      const action = event.payload?.action || 'updated';
      const title  = event.payload?.issue?.title?.slice(0, 72) || '';
      return `📋 **${date}** ${action.charAt(0).toUpperCase() + action.slice(1)} issue in [${repo}](${repoUrl})${title ? ` — _${title}_` : ''}`;
    }
    case 'WatchEvent':
      return `⭐ **${date}** Starred [${repo}](${repoUrl})`;
    case 'ForkEvent':
      return `🍴 **${date}** Forked [${repo}](${repoUrl})`;
    case 'ReleaseEvent': {
      const tag = event.payload?.release?.tag_name || '';
      return `🚀 **${date}** Released [${tag || 'new version'}](${repoUrl}/releases) in [${repo}](${repoUrl})`;
    }
    default:
      return `🔔 **${date}** ${event.type.replace('Event', '')} in [${repo}](${repoUrl})`;
  }
}

async function main() {
  let markdown;

  try {
    const url = `https://api.github.com/users/${USERNAME}/events/public?per_page=30`;
    const { status, body } = await get(url);

    if (status !== 200) throw new Error(`GitHub API ${status}`);

    const events = JSON.parse(body);

    // Filter to meaningful event types; exclude push events with 0 commits (GitHub Actions noise)
    const meaningful = events.filter(e => {
      if (!['PushEvent', 'PullRequestEvent', 'IssuesEvent', 'CreateEvent', 'ReleaseEvent'].includes(e.type)) return false;
      if (e.type === 'PushEvent' && (e.payload?.commits?.length ?? 0) === 0) return false;
      return true;
    }).slice(0, LIMIT);

    if (meaningful.length === 0) throw new Error('No meaningful events found');

    const lines = meaningful.map(e => `- ${formatEvent(e)}`);
    markdown = lines.join('\n');
  } catch (err) {
    console.warn(`[fetch-recent-activity] Could not fetch events: ${err.message}`);
    markdown = `_Recent activity data temporarily unavailable._`;
  }

  mkdirSync(join(__dirname, '..', '.cache'), { recursive: true });
  writeFileSync(join(__dirname, '..', '.cache', 'activity.md'), markdown, 'utf8');
  console.log('[fetch-recent-activity] Written to .cache/activity.md');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
