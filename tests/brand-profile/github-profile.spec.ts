import { test, expect, Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const expected = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/expected-data.json'), 'utf8'),
);

async function getPopularRepoCards(page: Page): Promise<Locator> {
  const selectorCandidates = [
    '[data-pinned-item-list-item]',
    'ol.pinned-items-list li',
    'section:has(h2:has-text("Popular repositories")) li',
  ];

  for (const selector of selectorCandidates) {
    const locator = page.locator(selector);
    if ((await locator.count()) >= 1) {
      return locator;
    }
  }

  return page.locator('section:has(h2:has-text("Popular repositories")) li');
}

test.describe('GitHub profile integrity', () => {
  test('profile page loads and shows correct username', async ({ page }) => {
    await page.goto(expected.profileUrl, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/arvind3|Arvind/i);
    await expect(page.locator('h1, .vcard-fullname').first()).toContainText(/Arvind|arvind3/i);
  });

  test('bio is not generic and includes positioning keywords', async ({ page }) => {
    await page.goto(expected.profileUrl, { waitUntil: 'domcontentloaded' });

    const bioLocator = page
      .locator('[data-bio-text], .p-note.user-profile-bio, [itemprop="description"]')
      .first();

    await expect(bioLocator).toBeVisible();
    const bio = (await bioLocator.textContent())?.trim() || '';

    expect(bio.toLowerCase()).not.toBe('building ai');
    expect(bio).toMatch(/AI|QA|Analytics|Engineering/i);
  });

  test('profile has 6 popular repos and none are forks', async ({ page }) => {
    await page.goto(expected.profileUrl, { waitUntil: 'domcontentloaded' });

    const pinned = await getPopularRepoCards(page);
    const count = await pinned.count();
    expect(count).toBe(6);

    for (let i = 0; i < count; i += 1) {
      await expect(pinned.nth(i)).not.toContainText(/Forked from/i);
    }
  });

  test('no repo called test is visible in pinned or popular', async ({ page }) => {
    await page.goto(expected.profileUrl, { waitUntil: 'domcontentloaded' });

    const pinned = await getPopularRepoCards(page);
    const count = await pinned.count();

    for (let i = 0; i < count; i += 1) {
      const repoLink = pinned.nth(i).locator('a[href*="/arvind3/"]').first();
      const href = await repoLink.getAttribute('href');
      const nameFromHref = href?.split('/').filter(Boolean).pop()?.toLowerCase();

      expect(nameFromHref).not.toBe('test');
    }
  });
});
