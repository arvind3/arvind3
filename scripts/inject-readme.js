#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const README_PATH = path.join(process.cwd(), 'README.md');
const GENERATED_DIR = path.join(process.cwd(), '.generated');

function readJson(fileName, fallback = null) {
  try {
    const fullPath = path.join(GENERATED_DIR, fileName);
    const raw = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function formatNumber(value) {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat('en-US').format(safe);
}

function sectionRegex(key) {
  return new RegExp(`(<!-- DYNAMIC:${key}:START -->)([\\s\\S]*?)(<!-- DYNAMIC:${key}:END -->)`, 'm');
}

function replaceSection(content, key, body) {
  const regex = sectionRegex(key);
  if (!regex.test(content)) {
    throw new Error(`README marker not found for ${key}`);
  }

  return content.replace(regex, `$1\n${body}\n$3`);
}

function buildMetricsMarkdown(metrics) {
  const summary = metrics?.summary || {};
  const topProjects = Array.isArray(metrics?.topProjects) ? metrics.topProjects.slice(0, 3) : [];

  const topProjectsLine = topProjects.length > 0
    ? topProjects
      .map((project) => `${project.name} (${formatNumber(project.pageViews)} views)`)
      .join(', ')
    : 'No traffic data available yet';

  const period = summary.period || '30days';

  return [
    `- Visitors (users): **${formatNumber(summary.totalUsers)}**`,
    `- Pageviews: **${formatNumber(summary.totalPageViews)}**`,
    `- Sessions: **${formatNumber(summary.totalSessions)}**`,
    `- Engagement rate: **${Number(summary.engagementRate || 0).toFixed(1)}%**`,
    `- Active projects count: **${formatNumber(summary.activeProjectsCount)}**`,
    `- Top repos by traffic: ${topProjectsLine}`,
    `- Metric window: \`${period}\``,
  ].join('\n');
}

function buildReposMarkdown(topRepos) {
  if (!Array.isArray(topRepos?.repos) || topRepos.repos.length === 0) {
    return 'No repositories available yet.';
  }

  const cards = topRepos.repos
    .map((repo) => [
      `<a href="${repo.url}">`,
      `  <img src="https://gh-card.dev/repos/${repo.fullName}.svg?fullname=1" alt="${repo.name}" />`,
      '</a>',
    ].join('\n'))
    .join('\n');

  const list = topRepos.repos
    .map((repo, index) => `${index + 1}. [${repo.name}](${repo.url}) - ${repo.description || 'No description yet'} (${repo.language || 'n/a'})`)
    .join('\n');

  return [
    '<div align="center">',
    '',
    cards,
    '',
    '</div>',
    '',
    list,
  ].join('\n');
}

function buildActivityMarkdown(activity) {
  if (!Array.isArray(activity?.items) || activity.items.length === 0) {
    return '- No recent public activity available.';
  }

  return activity.items
    .slice(0, 5)
    .map((item) => {
      const date = item.timestamp ? new Date(item.timestamp).toISOString().slice(0, 10) : 'unknown-date';
      return `- ${date} - [${item.summary}](${item.url})`;
    })
    .join('\n');
}

function main() {
  const metrics = readJson('dashboard-metrics.json', {});
  const topRepos = readJson('top-repos.json', { repos: [] });
  const activity = readJson('recent-activity.json', { items: [] });

  let readme = fs.readFileSync(README_PATH, 'utf8');

  readme = replaceSection(readme, 'METRICS', buildMetricsMarkdown(metrics));
  readme = replaceSection(readme, 'REPOS', buildReposMarkdown(topRepos));
  readme = replaceSection(readme, 'ACTIVITY', buildActivityMarkdown(activity));

  const today = new Date().toISOString().slice(0, 10);
  readme = replaceSection(readme, 'LAST_UPDATED', `Last refreshed: ${today}`);

  fs.writeFileSync(README_PATH, readme);
  console.log('[ok] README dynamic sections injected');
}

try {
  main();
} catch (error) {
  console.error(`[error] ${error.stack || error.message}`);
  process.exitCode = 1;
}
