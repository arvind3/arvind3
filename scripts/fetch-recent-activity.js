#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');

const OUTPUT_DIR = path.join(process.cwd(), '.generated');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'recent-activity.json');
const USERNAME = process.env.GITHUB_USERNAME || 'arvind3';
const MAX_ITEMS = Number(process.env.RECENT_ACTIVITY_COUNT || 5);

function eventToEntry(event) {
  const timestamp = event.created_at;
  const repo = event.repo?.name || `${USERNAME}/unknown`;

  switch (event.type) {
    case 'PushEvent': {
      const commit = event.payload?.commits?.[0];
      const sha = commit?.sha;
      const message = commit?.message ? commit.message.split('\n')[0] : 'Pushed commits';
      return {
        type: event.type,
        timestamp,
        summary: `${message} (${repo})`,
        url: sha ? `https://github.com/${repo}/commit/${sha}` : `https://github.com/${repo}`,
      };
    }
    case 'PullRequestEvent': {
      const pr = event.payload?.pull_request;
      return {
        type: event.type,
        timestamp,
        summary: `${event.payload?.action || 'updated'} PR: ${pr?.title || repo}`,
        url: pr?.html_url || `https://github.com/${repo}/pulls`,
      };
    }
    case 'IssuesEvent': {
      const issue = event.payload?.issue;
      return {
        type: event.type,
        timestamp,
        summary: `${event.payload?.action || 'updated'} issue: ${issue?.title || repo}`,
        url: issue?.html_url || `https://github.com/${repo}/issues`,
      };
    }
    case 'ReleaseEvent': {
      const release = event.payload?.release;
      return {
        type: event.type,
        timestamp,
        summary: `Published release: ${release?.name || release?.tag_name || repo}`,
        url: release?.html_url || `https://github.com/${repo}/releases`,
      };
    }
    case 'CreateEvent': {
      return {
        type: event.type,
        timestamp,
        summary: `Created ${event.payload?.ref_type || 'resource'} in ${repo}`,
        url: `https://github.com/${repo}`,
      };
    }
    default:
      return {
        type: event.type,
        timestamp,
        summary: `${event.type} in ${repo}`,
        url: `https://github.com/${repo}`,
      };
  }
}

async function githubRequest(url) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'arvind3-profile-readme-bot',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function main() {
  const events = await githubRequest(`https://api.github.com/users/${USERNAME}/events/public?per_page=30`);

  const interestingTypes = new Set([
    'PushEvent',
    'PullRequestEvent',
    'IssuesEvent',
    'ReleaseEvent',
    'CreateEvent',
  ]);

  const entries = events
    .filter((event) => interestingTypes.has(event.type))
    .map(eventToEntry)
    .slice(0, MAX_ITEMS);

  const output = {
    fetchedAt: new Date().toISOString(),
    username: USERNAME,
    items: entries,
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log(`[ok] Wrote ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(`[error] ${error.stack || error.message}`);
  process.exitCode = 1;
});
