import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const expected = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/expected-data.json'), 'utf8'),
);

test('shields.io badges resolve without errors', async ({ page }) => {
  await page.goto(expected.profileUrl, { waitUntil: 'domcontentloaded' });

  const badges = page.locator(
    'article.markdown-body img[src*="shields.io"], article.markdown-body img[src*="img.shields.io"]',
  );

  const count = await badges.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i += 1) {
    const badge = badges.nth(i);
    const src = await badge.getAttribute('src');

    await badge.scrollIntoViewIfNeeded();
    const loaded = await badge.evaluate((element) => (element as HTMLImageElement).naturalWidth > 0);
    expect(loaded, `Badge failed to load: ${src}`).toBe(true);
  }
});
