import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const expected = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/expected-data.json'), 'utf8'),
);

test('all repository links in README resolve', async ({ request }) => {
  const response = await request.get(expected.rawReadmeUrl);
  expect(response.ok()).toBeTruthy();

  const readme = await response.text();
  const repoUrls = (readme.match(/https:\/\/github\.com\/arvind3\/[A-Za-z0-9_.-]+/g) || [])
    .filter((url) => !url.endsWith('/arvind3'));

  const uniqueRepoUrls = [...new Set(repoUrls)];
  expect(uniqueRepoUrls.length).toBeGreaterThan(0);

  for (const url of uniqueRepoUrls) {
    const res = await request.get(url);
    expect(res.status(), `Broken repository link: ${url}`).toBeLessThan(400);
  }
});
