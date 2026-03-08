import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PROFILE_URL = 'https://github.com/arvind3';

// GitHub proxies external images through camo.githubusercontent.com.
// The original URL is stored in the data-canonical-src attribute.
// This helper resolves the original URL for matching.
function getOriginalSrc(img: HTMLImageElement): string {
  return img.getAttribute('data-canonical-src') || img.src || '';
}

test.describe('GitHub Profile: arvind3', () => {

  test('profile page loads', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/arvind3/i);
    console.log('\n✓ Profile page loaded\n');
  });

  test('key sections are visible', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    const readme = page.locator('[data-target="readme-toc.content"], .markdown-body').first();
    await expect(readme).toBeVisible();

    const content = await readme.innerText();
    const sections = [
      'Arvind Bhardwaj',
      'GitHub Activity',
      'Contribution Metrics',
      'Featured Work',
      'Focus Areas',
      'Deep Metrics',
      'Contribution Activity',
    ];

    console.log('\n=== Section visibility ===');
    for (const section of sections) {
      const found = content.includes(section);
      console.log(`  ${found ? '✓' : '✗'} "${section}"`);
      expect(content, `Section "${section}" missing from profile`).toContain(section);
    }
    console.log('=========================\n');
  });

  test('no broken images in README', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    const readme = page.locator('[data-target="readme-toc.content"], .markdown-body').first();

    const results = await readme.evaluate((container, getOriginalSrcFn) => {
      // eslint-disable-next-line no-new-func
      const resolveOriginal = new Function('img', `return (${getOriginalSrcFn})(img)`);
      const imgs = Array.from(container.querySelectorAll('img'));
      return imgs.map(img => ({
        originalSrc: img.getAttribute('data-canonical-src') || img.src || '',
        proxiedSrc: img.src,
        alt: img.alt || '',
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        broken: !img.complete || img.naturalWidth === 0,
      }));
    }, getOriginalSrc.toString());

    const broken = results.filter(r => r.broken);
    const loaded = results.filter(r => !r.broken);

    console.log(`\n=== Image audit: ${loaded.length} loaded, ${broken.length} broken ===`);
    results.forEach(r => {
      const status = r.broken ? '✗ BROKEN' : `✓ [${r.naturalWidth}px]`;
      const label = r.alt || r.originalSrc.split('?')[0].split('/').pop() || 'unknown';
      console.log(`  ${status}  ${label}`);
    });
    console.log('=======================================================\n');

    expect(broken, `${broken.length} broken image(s):\n${broken.map(b => `  - ${b.alt || b.originalSrc}`).join('\n')}`).toHaveLength(0);
  });

  test('github-readme-stats cards load (stats + top-langs)', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    const readme = page.locator('[data-target="readme-toc.content"], .markdown-body').first();

    const cards = await readme.evaluate((container) => {
      const imgs = Array.from(container.querySelectorAll('img'));
      return imgs
        .filter(img => {
          const src = img.getAttribute('data-canonical-src') || img.src || '';
          return src.includes('github-readme-stats') && !src.includes('/pin/');
        })
        .map(img => ({
          originalSrc: img.getAttribute('data-canonical-src') || img.src,
          alt: img.alt,
          loaded: img.complete && img.naturalWidth > 0,
          naturalWidth: img.naturalWidth,
        }));
    });

    console.log(`\n=== github-readme-stats main cards (${cards.length} found) ===`);
    cards.forEach(c => console.log(`  ${c.loaded ? '✓' : '✗'} ${c.alt} [w=${c.naturalWidth}]`));
    console.log('============================================================\n');

    expect(cards.length, 'Expected at least 2 stats cards (stats + top-langs)').toBeGreaterThanOrEqual(2);
    const broken = cards.filter(c => !c.loaded);
    expect(broken, `${broken.length} stats card(s) failed to load`).toHaveLength(0);
  });

  test('repo pin cards render (6 expected)', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    const readme = page.locator('[data-target="readme-toc.content"], .markdown-body').first();

    const pinCards = await readme.evaluate((container) => {
      const imgs = Array.from(container.querySelectorAll('img'));
      return imgs
        .filter(img => {
          const src = img.getAttribute('data-canonical-src') || img.src || '';
          return src.includes('/api/pin/') || src.includes('github-readme-stats') && img.alt !== 'GitHub Stats' && img.alt !== 'Top Languages';
        })
        .filter(img => {
          const src = img.getAttribute('data-canonical-src') || img.src || '';
          return src.includes('/pin/');
        })
        .map(img => ({
          repo: (img.getAttribute('data-canonical-src') || '').match(/repo=([^&]+)/)?.[1] || img.alt,
          alt: img.alt,
          loaded: img.complete && img.naturalWidth > 0,
          naturalWidth: img.naturalWidth,
        }));
    });

    console.log(`\n=== Repo pin cards (${pinCards.length} found, 6 expected) ===`);
    pinCards.forEach(c => console.log(`  ${c.loaded ? '✓' : '✗'} ${c.repo} [w=${c.naturalWidth}]`));
    console.log('===========================================================\n');

    expect(pinCards, 'Expected 6 repo pin cards').toHaveLength(6);
    const broken = pinCards.filter(c => !c.loaded);
    expect(broken, `${broken.length} pin card(s) failed to load`).toHaveLength(0);
  });

  test('streak stats card loads', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    const readme = page.locator('[data-target="readme-toc.content"], .markdown-body').first();

    const streakCard = await readme.evaluate((container) => {
      const imgs = Array.from(container.querySelectorAll('img'));
      const img = imgs.find(i => {
        const src = i.getAttribute('data-canonical-src') || i.src || '';
        return src.includes('streak-stats') || i.alt === 'GitHub Streak';
      });
      if (!img) return null;
      return {
        originalSrc: img.getAttribute('data-canonical-src') || img.src,
        loaded: img.complete && img.naturalWidth > 0,
        naturalWidth: img.naturalWidth,
      };
    });

    console.log(`\n=== Streak card ===`);
    if (streakCard) {
      console.log(`  ${streakCard.loaded ? '✓' : '✗ BROKEN'} naturalWidth=${streakCard.naturalWidth}`);
    } else {
      console.log('  ✗ NOT FOUND');
    }
    console.log('==================\n');

    expect(streakCard, 'Streak card not found in README').not.toBeNull();
    expect(streakCard!.loaded, 'Streak card failed to load').toBe(true);
  });

  test('lowlighter SVG assets load', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    const readme = page.locator('[data-target="readme-toc.content"], .markdown-body').first();

    const svgAssets = await readme.evaluate((container) => {
      const imgs = Array.from(container.querySelectorAll('img'));
      return imgs
        .filter(img => {
          const src = img.getAttribute('data-canonical-src') || img.src || img.getAttribute('src') || '';
          return src.includes('assets/') && src.includes('.svg');
        })
        .map(img => ({
          src: img.getAttribute('data-canonical-src') || img.getAttribute('src') || img.src,
          alt: img.alt,
          loaded: img.complete && img.naturalWidth > 0,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        }));
    });

    console.log(`\n=== Lowlighter SVG assets (${svgAssets.length} found) ===`);
    svgAssets.forEach(a => {
      const name = a.src.split('/').pop() || a.src;
      console.log(`  ${a.loaded ? '✓' : '✗ BROKEN'} ${name} [${a.naturalWidth}x${a.naturalHeight}]`);
    });
    console.log('=========================================================\n');

    expect(svgAssets.length, 'Expected at least 4 lowlighter SVG assets').toBeGreaterThanOrEqual(4);
    const broken = svgAssets.filter(a => !a.loaded);
    expect(broken, `${broken.length} SVG asset(s) broken`).toHaveLength(0);
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(10000);

    const outputDir = 'test-results';
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const screenshotPath = path.join(outputDir, 'profile-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n📸 Full-page screenshot: ${screenshotPath}\n`);
    await context.close();
  });

});
