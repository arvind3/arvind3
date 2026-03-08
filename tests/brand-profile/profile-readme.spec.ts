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
    expect(readme).toContain('## GitHub Stats');
    expect(readme).toContain('## GitHub Signal Board');
  });

  test('GitHub stats assets are referenced and available', async ({ request }) => {
    const readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
    const urls = readme.match(/https?:\/\/[^\s)>\"]+/g) || [];
    const imageUrls = [...new Set(urls)].filter((url) =>
      /shields\.io|gh-card\.dev/i.test(url),
    );

    expect(imageUrls.length).toBeGreaterThan(0);

    for (const url of imageUrls) {
      const response = await request.get(url);
      const status = response.status();
      expect(status < 500, `Image URL failed: ${url} (status ${status})`).toBe(true);
    }

    const localAssets = [
      'assets/github-metrics.svg',
      'assets/metrics-languages.svg',
      'assets/metrics-activity.svg',
      'assets/metrics-isocalendar.svg',
    ];

    for (const asset of localAssets) {
      expect(fs.existsSync(path.join(process.cwd(), asset)), `${asset} is missing`).toBe(true);
      expect(readme).toContain(`https://raw.githubusercontent.com/arvind3/arvind3/main/${asset}`);
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
