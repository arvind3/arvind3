import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const expected = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/expected-data.json'), 'utf8'),
);

test.describe('Meta and SEO validation', () => {
  test('GitHub profile has title and Open Graph tags', async ({ request }) => {
    const response = await request.get(expected.profileUrl);
    expect(response.ok()).toBeTruthy();

    const html = await response.text();
    expect(html).toMatch(/<title>[^<]*(arvind3|Arvind)[^<]*<\/title>/i);
    expect(html).toMatch(/property=\"og:title\"/i);
    expect(html).toMatch(/property=\"og:description\"|name=\"description\"/i);
  });

  test('dashboard has title and description metadata', async ({ page }) => {
    await page.goto(expected.dashboardUrl, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/Brand Analytics|Personal Brand Analytics/i);

    const viewportMeta = page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toHaveCount(1);
  });
});
