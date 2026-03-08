import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('shields.io badges resolve without errors', async ({ request }) => {
  const readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
  const badgeUrls = readme.match(/https?:\/\/[^\s\)\]\>"]*shields\.io[^\s\)\]\>"]*/gi) || [];
  const uniqueBadgeUrls = [...new Set(badgeUrls)];

  expect(uniqueBadgeUrls.length).toBeGreaterThan(0);

  for (const url of uniqueBadgeUrls) {
    const response = await request.get(url);
    const body = await response.text();

    expect(response.status(), `Badge failed to load: ${url}`).toBeLessThan(400);
    expect(body.toLowerCase()).not.toContain('invalid');
  }
});
