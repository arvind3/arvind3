import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const expected = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/expected-data.json'), 'utf8'),
);

test.describe('Dashboard data validation', () => {
  test('dashboard data endpoint returns expected summary fields', async ({ request }) => {
    const response = await request.get(expected.dashboardDataUrl);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.summary).toBeTruthy();
    expect(Number(data.summary.totalUsers)).toBeGreaterThanOrEqual(0);
    expect(Number(data.summary.totalPageViews)).toBeGreaterThanOrEqual(0);
    expect(Number(data.summary.totalSessions)).toBeGreaterThanOrEqual(0);
    expect(Number(data.summary.engagementRate)).toBeGreaterThanOrEqual(0);
    expect(Number(data.summary.engagementRate)).toBeLessThanOrEqual(100);
  });

  test('dashboard data is reasonably fresh', async ({ request }) => {
    const response = await request.get(expected.dashboardDataUrl);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.generatedAt).toBeTruthy();

    const generatedAt = new Date(data.generatedAt).getTime();
    const ageHours = (Date.now() - generatedAt) / (1000 * 60 * 60);

    expect(ageHours).toBeLessThanOrEqual(24 * 14);
  });

  test('projects dataset includes tracked repositories', async ({ request }) => {
    const response = await request.get(expected.dashboardProjectsUrl);
    expect(response.ok()).toBeTruthy();

    const projects = await response.json();
    expect(Array.isArray(projects.projects)).toBe(true);
    expect(projects.projects.length).toBeGreaterThan(0);

    const names = projects.projects.map((project: any) => String(project.name).toLowerCase());
    expect(names.join(' ')).toMatch(/brand-analytics|playwrite|grocery|github/i);
  });
});
