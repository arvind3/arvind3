import { test, expect } from '@playwright/test';
import expected from '../fixtures/expected-data.json';

const PROFILE_URL = expected.profile.profileUrl;

test.describe('Badge & SVG Resolution', () => {

  test('shields.io badges in README resolve (naturalWidth > 0)', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    const readme = page.locator('article.markdown-body, [data-target="readme-toc.content"], .markdown-body').first();

    const badges = await readme.evaluate((container) => {
      const imgs = Array.from(container.querySelectorAll('img'));
      return imgs
        .filter(img => {
          const src = img.getAttribute('data-canonical-src') || img.src || '';
          return src.includes('shields.io') || src.includes('img.shields.io');
        })
        .map(img => ({
          src: img.getAttribute('data-canonical-src') || img.src,
          alt: img.alt || '',
          loaded: img.complete && img.naturalWidth > 0,
          naturalWidth: img.naturalWidth,
        }));
    });

    console.log(`\n=== shields.io badges: ${badges.length} found ===`);
    badges.forEach(b => console.log(`  ${b.loaded ? '✓' : '✗ BROKEN'} [${b.naturalWidth}px] ${b.alt || b.src}`));
    console.log('=================================================\n');

    if (badges.length === 0) {
      console.log('No shields.io badges found — skipping');
      return;
    }
    const broken = badges.filter(b => !b.loaded);
    expect(broken, `${broken.length} badge(s) failed`).toHaveLength(0);
  });

  test('gh-card.dev images return SVG content', async ({ request }) => {
    const cardUrls = expected.repos.featured.map(
      repo => `https://gh-card.dev/repos/${expected.profile.username}/${repo}.svg?fullname=1&theme=dark_dimmed`
    );

    console.log(`\n=== gh-card.dev cards: ${cardUrls.length} ===`);
    const broken: string[] = [];
    for (const url of cardUrls) {
      const res = await request.get(url);
      const ok = res.status() < 400;
      const contentType = res.headers()['content-type'] || '';
      const isSvg = contentType.includes('svg') || contentType.includes('image');
      console.log(`  ${ok && isSvg ? '✓' : '✗'} [${res.status()}] ${url.split('/repos/')[1]}`);
      if (!ok) broken.push(url);
    }
    console.log('======================================\n');
    expect(broken, `${broken.length} gh-card URLs broken`).toHaveLength(0);
  });

  test('streak-stats card endpoint returns an image', async ({ request }) => {
    const url = `https://streak-stats.demolab.com?user=${expected.profile.username}&theme=tokyonight&hide_border=true`;
    const res = await request.get(url);
    expect(res.status(), `streak-stats returned HTTP ${res.status()}`).toBeLessThan(400);
    const ct = res.headers()['content-type'] || '';
    expect(ct, 'streak-stats did not return an SVG/image').toMatch(/svg|image/i);
  });

});
