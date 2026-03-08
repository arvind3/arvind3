import { test, expect } from '@playwright/test';
import expected from '../fixtures/expected-data.json';

const PROFILE_URL = expected.profile.profileUrl;

test.describe('GitHub Profile — arvind3', () => {

  test('profile page loads and title contains username', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/arvind3/i);
  });

  test('display name shows Arvind Bhardwaj', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    // GitHub renders name in the profile sidebar
    const nameEl = page.locator('[itemprop="name"], .p-name').first();
    await expect(nameEl).toContainText('Arvind Bhardwaj', { ignoreCase: true });
  });

  test('bio contains positioning keywords (not just generic "Building AI")', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    const bio = page.locator('[data-bio-text], .p-note').first();
    const bioText = await bio.textContent().catch(() => '');
    const keywords = ['AI', 'QA', 'Engineering', 'Automation', 'Analytics'];
    const matched = keywords.filter(k => bioText?.toLowerCase().includes(k.toLowerCase()));
    expect(matched.length, `Bio "${bioText}" lacks differentiation keywords`).toBeGreaterThanOrEqual(2);
  });

  test('profile README renders (markdown-body visible)', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    const readme = page.locator('article.markdown-body, [data-target="readme-toc.content"], .markdown-body').first();
    await expect(readme).toBeVisible();
  });

  test('no repo named "test" appears in pinned or popular section', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    const pinnedItems = page.locator('[data-pinned-item-list-item-content], .pinned-item-list-item-content');
    const count = await pinnedItems.count();
    for (let i = 0; i < count; i++) {
      const name = await pinnedItems.nth(i).locator('a.text-bold, span.repo').first().textContent();
      expect(name?.trim().toLowerCase(), 'Found banned repo "test" in pinned section').not.toBe('test');
    }
  });

  test('pinned repos exist (at least 1 visible)', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    const pinnedItems = page.locator('[data-pinned-item-list-item-content], .pinned-item-list-item-content');
    const count = await pinnedItems.count();
    expect(count, 'Expected at least 1 pinned repo').toBeGreaterThanOrEqual(1);
  });

});
