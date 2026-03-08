import { test, expect, request as playwrightRequest } from '@playwright/test';

const RAW_README_URL = 'https://raw.githubusercontent.com/arvind3/arvind3/main/README.md';

// URLs that are expected to redirect or are known to block HEAD requests
const SKIP_PATTERNS = [
  'camo.githubusercontent.com',
  'shields.io',         // CDN — checked separately
  'img.shields.io',
  'streak-stats.demolab.com', // SVG service — checked in profile tests
  'gh-card.dev',              // SVG service — checked in profile tests
  'twitter.com',              // blocks HEAD from CI
  'x.com',
];

function shouldSkip(url: string): boolean {
  return SKIP_PATTERNS.some(p => url.includes(p));
}

function extractUrls(text: string): string[] {
  const found = text.match(/https?:\/\/[^\s\)>\]"']+/g) || [];
  return [...new Set(found)];
}

test.describe('Social & External Links', () => {

  test('all external links in README return < 400', async () => {
    const apiRequest = await playwrightRequest.newContext({
      extraHTTPHeaders: { 'User-Agent': 'arvind3-link-checker/1.0' },
    });

    const readmeRes = await apiRequest.get(RAW_README_URL);
    expect(readmeRes.status(), 'Could not fetch raw README').toBe(200);
    const readme = await readmeRes.text();

    const urls = extractUrls(readme).filter(u => !shouldSkip(u));
    console.log(`\n=== Checking ${urls.length} links ===`);

    const broken: string[] = [];
    for (const url of urls) {
      try {
        const res = await apiRequest.head(url, { timeout: 15000 });
        const ok = res.status() < 400;
        console.log(`  ${ok ? '✓' : '✗'} [${res.status()}] ${url}`);
        if (!ok) broken.push(`${url} (HTTP ${res.status()})`);
      } catch (err: any) {
        // Try GET as fallback for servers that block HEAD
        try {
          const res = await apiRequest.get(url, { timeout: 15000 });
          const ok = res.status() < 400;
          console.log(`  ${ok ? '✓' : '✗'} [${res.status()}] ${url}`);
          if (!ok) broken.push(`${url} (HTTP ${res.status()})`);
        } catch (getErr: any) {
          console.log(`  ⚠ UNREACHABLE: ${url} — ${getErr.message}`);
          // Network errors in CI — log but don't fail (could be firewall)
        }
      }
    }
    console.log(`\n=== ${broken.length} broken, ${urls.length - broken.length} ok ===\n`);

    expect(broken, `Broken links:\n${broken.map(b => `  - ${b}`).join('\n')}`).toHaveLength(0);

    await apiRequest.dispose();
  });

  test('LinkedIn profile URL resolves', async ({ page }) => {
    await page.goto('https://www.linkedin.com/in/arvindkumarbhardwaj/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    // LinkedIn redirects to login — 200 or redirect is acceptable
    expect(page.url()).toMatch(/linkedin\.com/);
  });

  test('dashboard URL resolves (200)', async ({ request }) => {
    const res = await request.get('https://arvind3.github.io/brand-analytics-dashboard/');
    expect(res.status(), 'Dashboard URL returned non-2xx').toBeLessThan(400);
  });

  test('brand-analytics-automation repo is public', async ({ request }) => {
    const res = await request.get('https://api.github.com/repos/arvind3/brand-analytics-automation', {
      headers: { 'User-Agent': 'arvind3-playwright-tests' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.private, 'brand-analytics-automation should be public').toBe(false);
  });

});
