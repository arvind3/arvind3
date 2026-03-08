import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const expected = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/expected-data.json'), 'utf8'),
);

test.describe('Accessibility checks for dashboard', () => {
  test('dashboard has no images without alt text', async ({ page }) => {
    await page.goto(expected.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const imagesWithoutAlt = await page.locator('img:not([alt]), img[alt=""]').count();
    expect(imagesWithoutAlt).toBe(0);
  });

  test('dashboard has proper heading hierarchy', async ({ page }) => {
    await page.goto(expected.dashboardUrl, { waitUntil: 'domcontentloaded' });

    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    const h2OrH3Count = await page.locator('h2, h3').count();
    expect(h2OrH3Count).toBeGreaterThan(0);
  });
});
