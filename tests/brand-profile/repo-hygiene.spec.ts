import { test, expect, request as playwrightRequest } from '@playwright/test';
import expected from '../fixtures/expected-data.json';

const PROFILE_URL = expected.profile.profileUrl;

test.describe('Repo Hygiene', () => {

  test('featured repos in README are all from expected list', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    const readme = page.locator('article.markdown-body, [data-target="readme-toc.content"], .markdown-body').first();
    const content = await readme.innerText();

    console.log('\n=== Featured repo presence ===');
    for (const repo of expected.repos.featured) {
      const found = content.includes(repo);
      console.log(`  ${found ? '✓' : '✗'} ${repo}`);
      expect(content, `Featured repo "${repo}" missing from README`).toContain(repo);
    }
    console.log('==============================\n');
  });

  test('banned repos do not appear in README', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    const readme = page.locator('article.markdown-body, [data-target="readme-toc.content"], .markdown-body').first();
    const content = await readme.innerText().catch(() => '');

    for (const banned of expected.repos.banned) {
      // Only flag if it appears as a standalone repo link, not as part of a longer name
      const regex = new RegExp(`\\b${banned}\\b`, 'i');
      expect(regex.test(content), `Banned repo "${banned}" found in README`).toBe(false);
    }
  });

  test('all 6 featured repos exist and are accessible via GitHub API', async () => {
    const apiRequest = await playwrightRequest.newContext();

    console.log('\n=== GitHub API repo existence check ===');
    for (const repo of expected.repos.featured) {
      const res = await apiRequest.get(`https://api.github.com/repos/${expected.profile.username}/${repo}`, {
        headers: { 'User-Agent': 'arvind3-playwright-tests' },
      });
      const ok = res.status() === 200 || res.status() === 301;
      console.log(`  ${ok ? '✓' : '✗'} ${repo} (HTTP ${res.status()})`);
      expect(res.status(), `Repo ${repo} returned HTTP ${res.status()}`).toBeLessThan(400);
    }
    console.log('=======================================\n');

    await apiRequest.dispose();
  });

});
