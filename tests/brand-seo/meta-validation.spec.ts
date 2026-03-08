import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const expected = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/expected-data.json'), 'utf8'),
);

test.describe('Meta and SEO validation', () => {
  test('GitHub profile has title and Open Graph tags', async ({ page }) => {
    await page.goto(expected.profileUrl, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/arvind3|Arvind/i);

    const ogTitle = page.locator('meta[property="og:title"]');
    const ogDescription = page.locator('meta[property="og:description"], meta[name="description"]');

    await expect(ogTitle.first()).toHaveAttribute('content', /arvind3|Arvind/i);
    await expect(ogDescription.first()).toHaveAttribute('content', /GitHub|profile|Arvind|repositories/i);
  });

  test('dashboard has title and description metadata', async ({ page }) => {
    await page.goto(expected.dashboardUrl, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/Brand Analytics|Personal Brand Analytics/i);

    const viewportMeta = page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toHaveCount(1);
  });
});
