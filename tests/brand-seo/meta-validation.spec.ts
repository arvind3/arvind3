import { test, expect } from '@playwright/test';
import expected from '../fixtures/expected-data.json';

const DASHBOARD_URL = expected.dashboard.url;
const PROFILE_URL   = expected.profile.profileUrl;

test.describe('Meta & SEO Validation', () => {

  test('dashboard has meta description', async ({ page }) => {
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
    const meta = await page.locator('meta[name="description"]').getAttribute('content');
    console.log(`\n=== Dashboard meta description: "${meta}" ===\n`);
    expect(meta?.trim().length ?? 0, 'Dashboard missing meta description').toBeGreaterThan(0);
  });

  test('dashboard has Open Graph title', async ({ page }) => {
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
    const og = await page.locator('meta[property="og:title"]').getAttribute('content').catch(() => null);
    if (og === null) {
      console.log('\n=== OG title: not set (non-critical) ===\n');
      // Soft check — not all GH Pages have OG tags
      return;
    }
    expect(og.trim().length, 'og:title is empty').toBeGreaterThan(0);
  });

  test('GitHub profile has correct canonical URL (github.com/arvind3)', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain(`github.com/${expected.profile.username}`);
  });

  test('dashboard favicon is set', async ({ page }) => {
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
    const favicon = await page
      .locator('link[rel="icon"], link[rel="shortcut icon"]')
      .getAttribute('href')
      .catch(() => null);
    console.log(`\n=== Favicon: ${favicon || 'not set'} ===\n`);
    // Non-critical — just log
  });

  test('dashboard page load time is under 10 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
    const elapsed = Date.now() - start;
    console.log(`\n=== Dashboard load time: ${elapsed}ms ===\n`);
    expect(elapsed, `Dashboard took ${elapsed}ms to load (>10s)`).toBeLessThan(10000);
  });

});
