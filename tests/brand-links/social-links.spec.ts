import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const expected = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/expected-data.json'), 'utf8'),
);

function normalizeUrl(rawUrl: string): string {
  return rawUrl.replace(/[),.]+$/g, '');
}

test('all external links in profile README return success', async ({ request }) => {
  const response = await request.get(expected.rawReadmeUrl);
  expect(response.ok()).toBeTruthy();

  const readme = await response.text();
  const urls = readme.match(/https?:\/\/[^\s\)\]\>"]+/g) || [];
  const uniqueUrls = [...new Set(urls.map(normalizeUrl))];

  expect(uniqueUrls.length).toBeGreaterThan(0);

  for (const url of uniqueUrls) {
    if (url.includes('camo.githubusercontent.com')) {
      continue;
    }

    let status: number;
    try {
      const headResponse = await request.fetch(url, { method: 'HEAD' });
      status = headResponse.status();

      if (status === 405 || status === 403) {
        const getResponse = await request.get(url);
        status = getResponse.status();
      }
    } catch {
      throw new Error(`Link unreachable: ${url}`);
    }

    expect(status, `Broken link: ${url}`).toBeLessThan(400);
  }
});
