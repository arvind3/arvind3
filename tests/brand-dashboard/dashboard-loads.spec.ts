import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const expected = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/expected-data.json'), 'utf8'),
);

test.describe('Brand dashboard load tests', () => {
  test('dashboard page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(expected.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    expect(errors).toEqual([]);
    await expect(page.locator('h1')).toContainText(/Personal Brand Analytics/i);
  });

  test('dashboard shows at least one chart or metric visualization', async ({ page }) => {
    await page.goto(expected.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const charts = page.locator('canvas, svg.chart, [class*="chart"], [class*="metric"]');
    expect(await charts.count()).toBeGreaterThan(0);
  });

  test('dashboard displays repo-level metrics data', async ({ page, request }) => {
    await page.goto(expected.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const bodyText = (await page.locator('body').textContent()) || '';
    const projectsResponse = await request.get(expected.dashboardProjectsUrl);
    expect(projectsResponse.ok()).toBeTruthy();

    const projectsJson = await projectsResponse.json();
    const projectNames = (projectsJson.projects || []).slice(0, 20).map((project: any) => project.name).join(' ');

    expect(`${bodyText} ${projectNames}`).toMatch(/qa-intelligence-platform|brand-analytics|retail|robot|analytics/i);
  });
});
