import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

function normalizeUrl(rawUrl: string): string {
  return rawUrl.replace(/[),.]+$/g, '');
}

test('all external links in profile README return success', async ({ request }) => {
  const readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
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

    const isLinkedInAntiBotResponse = url.includes('linkedin.com') && status === 999;
    const isTransientBadgeServiceFailure =
      /(github-readme-stats\.vercel\.app|streak-stats\.demolab\.com)/i.test(url) &&
      [429, 503, 504].includes(status);
    expect(
      status < 400 || isLinkedInAntiBotResponse || isTransientBadgeServiceFailure,
      `Broken link: ${url} (status ${status})`,
    ).toBe(true);
  }
});
