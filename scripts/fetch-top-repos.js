#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');

const OUTPUT_DIR = path.join(process.cwd(), '.generated');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'top-repos.json');
const USERNAME = process.env.GITHUB_USERNAME || 'arvind3';
const MAX_REPOS = Number(process.env.TOP_REPOS_COUNT || 6);

function parseRateLimitReset(headers) {
  const reset = headers.get('x-ratelimit-reset');
  return reset ? Number(reset) * 1000 : null;
}

async function githubRequest(url, retries = 3) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'arvind3-profile-readme-bot',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, { headers });

    if (response.ok) {
      return response.json();
    }

    const isRateLimited = response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0';
    if (isRateLimited) {
      const resetAt = parseRateLimitReset(response.headers);
      const resetIso = resetAt ? new Date(resetAt).toISOString() : 'unknown';
      throw new Error(`GitHub API rate limit reached. Retry after ${resetIso}.`);
    }

    if (response.status >= 500 || response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
      continue;
    }

    const errorText = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${errorText}`);
  }

  throw new Error(`GitHub API request failed after retries: ${url}`);
}

function scoreRepository(repo) {
  const now = Date.now();
  const pushedAt = new Date(repo.pushed_at).getTime();
  const ageDays = (now - pushedAt) / (1000 * 60 * 60 * 24);
  const activityScore = Math.max(0, 90 - ageDays);
  const stars = Number(repo.stargazers_count || 0);
  const forks = Number(repo.forks_count || 0);

  return stars * 100 + forks * 10 + activityScore;
}

async function main() {
  const repos = await githubRequest(`https://api.github.com/users/${USERNAME}/repos?per_page=100&type=owner&sort=updated`);

  const ranked = repos
    .filter((repo) => !repo.fork && !repo.archived)
    .map((repo) => ({
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      description: repo.description || '',
      stars: Number(repo.stargazers_count || 0),
      forks: Number(repo.forks_count || 0),
      language: repo.language,
      topics: Array.isArray(repo.topics) ? repo.topics : [],
      pushedAt: repo.pushed_at,
      score: Number(scoreRepository(repo).toFixed(2)),
    }))
    .sort((a, b) => b.score - a.score || b.stars - a.stars || new Date(b.pushedAt) - new Date(a.pushedAt))
    .slice(0, MAX_REPOS);

  const output = {
    fetchedAt: new Date().toISOString(),
    username: USERNAME,
    algorithm: 'score = stars*100 + forks*10 + recency(90-day window)',
    repos: ranked,
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log(`[ok] Wrote ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(`[error] ${error.stack || error.message}`);
  process.exitCode = 1;
});
