import { test, expect } from '@playwright/test';
import expected from '../fixtures/expected-data.json';

const DASHBOARD_URL = expected.dashboard.url;

test.describe('Brand Analytics Dashboard — load & render', () => {

  test('dashboard page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });

    const criticalErrors = errors.filter(e =>
      !e.includes('ResizeObserver') && // common benign browser warning
      !e.includes('Non-Error promise rejection')
    );

    console.log(`\n=== Console errors: ${criticalErrors.length} ===`);
    criticalErrors.forEach(e => console.log(`  ✗ ${e}`));
    console.log('================================\n');

    expect(criticalErrors, `Dashboard has ${criticalErrors.length} console error(s)`).toHaveLength(0);
  });

  test('dashboard renders visible content above the fold', async ({ page }) => {
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
    const body = page.locator('body');
    await expect(body).toBeVisible();
    // Must have some text content
    const text = await body.innerText();
    expect(text.trim().length, 'Dashboard body appears empty').toBeGreaterThan(50);
  });

  test('dashboard shows at least one chart or metric element', async ({ page }) => {
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // allow JS rendering

    const chartCount = await page.locator('canvas, svg, [class*="chart"], [class*="metric"], [class*="graph"]').count();
    console.log(`\n=== Chart/metric elements: ${chartCount} ===\n`);
    expect(chartCount, 'Expected at least 1 chart/metric element').toBeGreaterThanOrEqual(expected.dashboard.minChartCount);
  });

  test('dashboard displays repo-level content', async ({ page }) => {
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const content = await page.locator('body').innerText();

    const keywords = expected.dashboard.expectedContentKeywords;
    const matched = keywords.filter(k => content.toLowerCase().includes(k.toLowerCase()));
    console.log(`\n=== Dashboard keyword matches: ${matched.length}/${keywords.length} ===`);
    matched.forEach(k => console.log(`  ✓ "${k}"`));
    keywords.filter(k => !matched.includes(k)).forEach(k => console.log(`  ✗ "${k}" (not found)`));
    console.log('================================================\n');

    expect(matched.length, `Dashboard missing expected content keywords`).toBeGreaterThanOrEqual(1);
  });

  test('dashboard page title is set', async ({ page }) => {
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    expect(title.trim().length, 'Dashboard page has no title').toBeGreaterThan(0);
    console.log(`\n=== Dashboard title: "${title}" ===\n`);
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const { mkdirSync } = await import('fs');
    mkdirSync('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });
    console.log('\n📸 Screenshot saved: test-results/dashboard-desktop.png\n');
    await context.close();
  });

});
