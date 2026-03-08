import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const expected = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/expected-data.json'), 'utf8'),
);

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

for (const viewport of viewports) {
  test(`dashboard renders correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(expected.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const scrollWidth = await page.evaluate(() => {
      return Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
    });

    expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 80);

    await page.screenshot({
      path: `test-results/dashboard-${viewport.name}.png`,
      fullPage: true,
    });
  });
}
