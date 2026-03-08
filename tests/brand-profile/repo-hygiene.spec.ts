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

test.describe('Repository hygiene checks', () => {
  test('popular repositories section shows six entries', async ({ page }) => {
    await page.goto(expected.profileUrl, { waitUntil: 'domcontentloaded' });
    const cards = await getPopularRepoCards(page);
    await expect(cards).toHaveCount(6);
  });

  test('popular repositories are not forks and have usable descriptions', async ({ page }) => {
    await page.goto(expected.profileUrl, { waitUntil: 'domcontentloaded' });
    const cards = await getPopularRepoCards(page);

    const count = await cards.count();
    let describedRepos = 0;

    for (let i = 0; i < count; i += 1) {
      const card = cards.nth(i);
      await expect(card).not.toContainText(/Forked from/i);

      const description = (await card.locator('p').first().textContent())?.trim() || '';
      if (description.length >= 12) {
        describedRepos += 1;
      }
    }

    expect(describedRepos).toBeGreaterThanOrEqual(4);
  });

  test('candidate featured repositories are owner repos (non-forks)', async ({ request }) => {
    const response = await request.get('https://api.github.com/users/arvind3/repos?per_page=100&type=owner&sort=updated');
    expect(response.ok()).toBeTruthy();

    const repos = await response.json();
    const byName = new Map(repos.map((repo: any) => [repo.name.toLowerCase(), repo]));

    const featured = [
      'qa-intelligence-platform',
      'brand-analytics-automation',
      'robot-finetune-model',
      'retail_analytics',
      'founder-os',
      'RobotFrameworkBookWithIDE',
    ];

    for (const repoName of featured) {
      const repo = byName.get(repoName.toLowerCase());
      if (!repo) {
        continue;
      }

      expect(repo.fork).toBe(false);
    }
  });
});
