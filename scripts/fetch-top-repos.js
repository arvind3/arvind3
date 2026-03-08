#!/usr/bin/env node
/**
 * fetch-top-repos.js
 * Queries the GitHub API for arvind3's non-forked repos, ranks by stars + recent push,
 * and outputs a markdown table snippet.
 *
 * Requires GITHUB_TOKEN env var (or falls back to unauthenticated, lower rate limit).
 */

import https from 'https';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.METRICS_TOKEN || '';
const USERNAME = 'arvind3';

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

async function fetchAllRepos() {
  const repos = [];
  let page = 1;
  while (true) {
    const url = `https://api.github.com/users/${USERNAME}/repos?type=owner&per_page=100&page=${page}`;
    const { status, body } = await get(url);
    if (status !== 200) throw new Error(`GitHub API ${status}: ${body}`);
    const page_repos = JSON.parse(body);
    if (page_repos.length === 0) break;
    repos.push(...page_repos);
    page++;
  }
  return repos;
}

async function main() {
  let markdown;

  try {
    const allRepos = await fetchAllRepos();

    // Exclude forks, archived repos, demo/test/utility repos, and the profile repo itself
    const SKIP = new Set(['test', USERNAME, 'upptime', 'semprademo-test', 'sempra-demo']);
    const original = allRepos.filter(
      r => !r.fork && !r.archived && !SKIP.has(r.name.toLowerCase())
    );

    // Score = stars * 3 + days_since_push_weight
    const now = Date.now();
    const scored = original.map(r => {
      const daysSincePush = (now - new Date(r.pushed_at).getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 30 - daysSincePush); // up to +30 for pushed today
      return { ...r, score: (r.stargazers_count * 3) + recencyScore };
    });

    scored.sort((a, b) => b.score - a.score);
    const top10 = scored.slice(0, 10);

    const rows = top10.map(r => {
      const stars = r.stargazers_count > 0 ? `⭐ ${r.stargazers_count}` : '—';
      const lang  = r.language || '—';
      const desc  = (r.description || '').replace(/\|/g, '\\|').slice(0, 60);
      return `| [${r.name}](${r.html_url}) | ${desc} | ${lang} | ${stars} |`;
    });

    markdown = `### Top Repos by Activity\n\n| Repo | Description | Language | Stars |\n|---|---|---|---|\n${rows.join('\n')}`;
  } catch (err) {
    console.warn(`[fetch-top-repos] Could not fetch repos: ${err.message}`);
    markdown = `_Repo data temporarily unavailable._`;
  }

  mkdirSync(join(__dirname, '..', '.cache'), { recursive: true });
  writeFileSync(join(__dirname, '..', '.cache', 'repos.md'), markdown, 'utf8');
  console.log('[fetch-top-repos] Written to .cache/repos.md');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
