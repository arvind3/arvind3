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

  test('dynamic metrics section is populated', async () => {
    const readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
    expect(readme).not.toContain('<!-- auto-generated content here -->');
    expect(readme).toMatch(/pageviews|visitors|sessions/i);
    expect(readme).toMatch(/Top repos by traffic/i);
  });

  test('all GitHub stats badge images resolve', async ({ request }) => {
    const readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
    const urls = readme.match(/https?:\/\/[^\s)>\"]+/g) || [];
    const imageUrls = [...new Set(urls)].filter((url) =>
      /github-readme-stats|streak-stats|github-readme-activity-graph|shields\.io|gh-card\.dev|snake/i.test(url),
    );

    expect(imageUrls.length).toBeGreaterThan(0);

    for (const url of imageUrls) {
      const response = await request.get(url);
      const status = response.status();
      const isTransientBadgeFailure =
        /(github-readme-stats\.vercel\.app|streak-stats\.demolab\.com)/i.test(url) &&
        [429, 503, 504].includes(status);
      expect(status < 500 || isTransientBadgeFailure, `Image URL failed: ${url} (status ${status})`).toBe(true);
    }
  });

  test('contribution snake SVG is referenced and asset exists', async () => {
    const readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
    expect(readme).toMatch(/contributions-snake\.svg/i);

    const snakePath = path.join(process.cwd(), 'assets', 'contributions-snake.svg');
    expect(fs.existsSync(snakePath)).toBe(true);
  });

  test('Last refreshed timestamp is within last 48 hours', async () => {
    const readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
    const match = readme.match(/Last refreshed:\s*(\d{4}-\d{2}-\d{2})/);
    expect(match).toBeTruthy();

    const lastRefresh = new Date(`${match![1]}T00:00:00Z`).getTime();
    const hoursSince = (Date.now() - lastRefresh) / (1000 * 60 * 60);
    expect(hoursSince).toBeLessThanOrEqual(expected.maxRefreshAgeHours);
  });
});
