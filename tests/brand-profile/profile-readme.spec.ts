import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const expected = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/expected-data.json'), 'utf8'),
);

test.describe('Profile README dynamic rendering', () => {
  test('README renders on profile page', async ({ page }) => {
    await page.goto(expected.profileUrl, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article.markdown-body').first()).toBeVisible();
  });

  test('dynamic metrics section is populated', async ({ request }) => {
    const response = await request.get(expected.rawReadmeUrl);
    expect(response.ok()).toBeTruthy();

    const readme = await response.text();
    expect(readme).not.toContain('<!-- auto-generated content here -->');
    expect(readme).toMatch(/pageviews|visitors|sessions/i);
    expect(readme).toMatch(/Top repos by traffic/i);
  });

  test('all GitHub stats badge images load successfully', async ({ page }) => {
    await page.goto(expected.profileUrl, { waitUntil: 'domcontentloaded' });
    const readme = page.locator('article.markdown-body').first();
    await expect(readme).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);

    const results = await readme.locator('img').evaluateAll((images) => {
      return images
        .map((image) => {
          const img = image as HTMLImageElement;
          const src = img.getAttribute('data-canonical-src') || img.getAttribute('src') || img.src || '';
          return {
            src,
            loaded: img.naturalWidth > 0,
          };
        })
        .filter((entry) =>
          /github-readme-stats|streak-stats|github-readme-activity-graph|shields\.io|gh-card\.dev|snake/i.test(entry.src),
        );
    });

    expect(results.length).toBeGreaterThan(0);
    const failed = results.filter((result) => !result.loaded);
    expect(failed, `Images failed to load: ${failed.map((entry) => entry.src).join(', ')}`).toHaveLength(0);
  });

  test('contribution snake SVG renders', async ({ page }) => {
    await page.goto(expected.profileUrl, { waitUntil: 'domcontentloaded' });

    const snake = page
      .locator('article.markdown-body img[alt*="snake" i], article.markdown-body img[src*="snake" i]')
      .first();

    await expect(snake).toBeVisible();
    const loaded = await snake.evaluate((el) => (el as HTMLImageElement).naturalWidth > 0);
    expect(loaded).toBe(true);
  });

  test('Last refreshed timestamp is within last 48 hours', async ({ request }) => {
    const response = await request.get(expected.rawReadmeUrl);
    expect(response.ok()).toBeTruthy();

    const readme = await response.text();
    const match = readme.match(/Last refreshed:\s*(\d{4}-\d{2}-\d{2})/);
    expect(match).toBeTruthy();

    const lastRefresh = new Date(`${match![1]}T00:00:00Z`).getTime();
    const hoursSince = (Date.now() - lastRefresh) / (1000 * 60 * 60);
    expect(hoursSince).toBeLessThanOrEqual(expected.maxRefreshAgeHours);
  });
});
