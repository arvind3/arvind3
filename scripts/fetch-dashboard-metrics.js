#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');

const OUTPUT_DIR = path.join(process.cwd(), '.generated');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'dashboard-metrics.json');
const USERNAME = process.env.GITHUB_USERNAME || 'arvind3';

const METRICS_CANDIDATES = [
  process.env.DASHBOARD_METRICS_URL,
  'https://arvind3.github.io/brand-analytics-dashboard/data-30days.json',
  'https://arvind3.github.io/brand-analytics-automation/data-30days.json',
].filter(Boolean);

const PROJECTS_CANDIDATES = [
  process.env.DASHBOARD_PROJECTS_URL,
  'https://arvind3.github.io/brand-analytics-dashboard/projects.json',
  'https://arvind3.github.io/brand-analytics-automation/projects.json',
].filter(Boolean);

async function fetchJson(url, retries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'arvind3-profile-readme-bot',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${url}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  throw lastError;
}

async function firstSuccessfulJson(candidates) {
  for (const url of candidates) {
    try {
      const json = await fetchJson(url);
      return { url, json };
    } catch (error) {
      console.warn(`[warn] Could not load ${url}: ${error.message}`);
    }
  }

  return { url: null, json: null };
}

function normalizeMetrics(json) {
  if (!json || typeof json !== 'object') {
    return null;
  }

  const summary = json.summary || json.metrics || {};

  return {
    generatedAt: json.generatedAt || json.updated_at || null,
    period: json.period || '30days',
    totalUsers: Number(summary.totalUsers ?? summary.users ?? 0),
    totalPageViews: Number(summary.totalPageViews ?? summary.pageViews ?? summary.views ?? 0),
    totalSessions: Number(summary.totalSessions ?? summary.sessions ?? 0),
    engagementRate: Number(summary.engagementRate ?? 0),
    byProject: Array.isArray(json.byProject) ? json.byProject : [],
  };
}

function normalizeProjects(json) {
  if (!json || !Array.isArray(json.projects)) {
    return [];
  }

  return json.projects.map((project) => ({
    name: project.name || project.project_key || 'unknown-project',
    key: project.project_key || project.name || 'unknown-project',
    pageViews: Number(project.pageViews || project.page_views || 0),
    trackingInstalled: Boolean(project.tracking_installed),
    lastUpdated: project.last_updated || null,
  }));
}

function fallbackMetricsFromProjects(projects) {
  const tracked = projects.filter((project) => project.trackingInstalled).length;

  return {
    generatedAt: new Date().toISOString(),
    period: '30days',
    totalUsers: 0,
    totalPageViews: 0,
    totalSessions: 0,
    engagementRate: 0,
    byProject: projects.slice(0, 5).map((project) => ({
      projectKey: project.key,
      pageViews: project.pageViews,
      users: 0,
    })),
    fallbackTrackedCount: tracked,
  };
}

async function fetchRepoCount() {
  try {
    const response = await fetch(`https://api.github.com/users/${USERNAME}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'arvind3-profile-readme-bot',
      },
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    return Number(json.public_repos || 0);
  } catch (error) {
    console.warn(`[warn] Could not fetch GitHub user fallback: ${error.message}`);
    return null;
  }
}

async function main() {
  const metricsResult = await firstSuccessfulJson(METRICS_CANDIDATES);
  const projectsResult = await firstSuccessfulJson(PROJECTS_CANDIDATES);

  const normalizedProjects = normalizeProjects(projectsResult.json);
  let metrics = normalizeMetrics(metricsResult.json);

  if (!metrics) {
    metrics = fallbackMetricsFromProjects(normalizedProjects);
  }

  const topProjectsFromMetrics = metrics.byProject
    .map((entry) => ({
      name: entry.projectKey || entry.name || 'unknown-project',
      pageViews: Number(entry.pageViews || 0),
      users: Number(entry.users || 0),
    }))
    .sort((a, b) => b.pageViews - a.pageViews)
    .slice(0, 3);

  const topProjects = topProjectsFromMetrics.length > 0
    ? topProjectsFromMetrics
    : normalizedProjects
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, 3)
      .map((project) => ({ name: project.name, pageViews: project.pageViews, users: 0 }));

  const repoCountFallback = await fetchRepoCount();
  const activeProjectsCount = normalizedProjects.length > 0
    ? normalizedProjects.length
    : repoCountFallback || 0;

  const output = {
    fetchedAt: new Date().toISOString(),
    source: {
      metricsUrl: metricsResult.url,
      projectsUrl: projectsResult.url,
    },
    summary: {
      totalUsers: metrics.totalUsers,
      totalPageViews: metrics.totalPageViews,
      totalSessions: metrics.totalSessions,
      engagementRate: metrics.engagementRate,
      period: metrics.period,
      dashboardGeneratedAt: metrics.generatedAt,
      activeProjectsCount,
    },
    topProjects,
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log(`[ok] Wrote ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(`[error] ${error.stack || error.message}`);
  process.exitCode = 1;
});
