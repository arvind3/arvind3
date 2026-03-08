import { test, expect } from '@playwright/test';
import expected from '../fixtures/expected-data.json';

const PROFILE_URL = expected.profile.profileUrl;

test.describe('Profile README — content & dynamic sections', () => {

  test('all required sections are present', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    const readme = page.locator('article.markdown-body, [data-target="readme-toc.content"], .markdown-body').first();
    await expect(readme).toBeVisible();
    const content = await readme.innerText();

    console.log('\n=== Section presence ===');
    for (const section of expected.readme.requiredSections) {
      const found = content.includes(section);
      console.log(`  ${found ? '✓' : '✗'} "${section}"`);
      expect(content, `Missing section: "${section}"`).toContain(section);
    }
    console.log('========================\n');
  });

  test('dynamic TIMESTAMP marker is replaced (not "never")', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    const readme = page.locator('article.markdown-body, .markdown-body').first();
    const content = await readme.innerText();
    // The footer sub line should contain "Last refreshed:" followed by a date, not "never"
    const hasTimestamp = /Last refreshed:\s*\d{4}-\d{2}-\d{2}/.test(content);
    console.log(`\n=== Timestamp: ${hasTimestamp ? 'present' : 'MISSING / never'} ===\n`);
    expect(hasTimestamp, 'Dynamic timestamp not injected — still shows "never"').toBe(true);
  });

  test('timestamp is within last 48 hours', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    const readme = page.locator('article.markdown-body, .markdown-body').first();
    const content = await readme.innerText();
    const match = content.match(/Last refreshed:\s*(\d{4}-\d{2}-\d{2})/);
    if (!match) {
      // Timestamp not yet injected — skip rather than hard-fail (first run)
      console.warn('Timestamp not yet present — skipping freshness check');
      return;
    }
    const lastRefresh = new Date(match[1]);
    const hoursSince = (Date.now() - lastRefresh.getTime()) / (1000 * 60 * 60);
    console.log(`\n=== Timestamp age: ${hoursSince.toFixed(1)}h ===\n`);
    expect(hoursSince, `Timestamp is ${hoursSince.toFixed(1)}h old — exceeds 48h`).toBeLessThan(48);
  });

  test('all badge/SVG images in README are loaded (naturalWidth > 0)', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000); // allow external SVG services to respond

    const readme = page.locator('article.markdown-body, [data-target="readme-toc.content"], .markdown-body').first();

    const results = await readme.evaluate((container) => {
      const imgs = Array.from(container.querySelectorAll('img'));
      return imgs.map(img => ({
        src: img.getAttribute('data-canonical-src') || img.getAttribute('src') || img.src || '',
        alt: img.alt || '',
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        broken: !img.complete || img.naturalWidth === 0,
      }));
    });

    const broken = results.filter(r => r.broken);
    const loaded = results.filter(r => !r.broken);

    console.log(`\n=== Image audit: ${loaded.length} loaded, ${broken.length} broken ===`);
    results.forEach(r => {
      const label = r.alt || r.src.split('?')[0].split('/').pop() || 'unknown';
      console.log(`  ${r.broken ? '✗ BROKEN' : `✓ [${r.naturalWidth}px]`}  ${label}`);
    });
    console.log('=========================================================\n');

    expect(broken, `${broken.length} broken image(s):\n${broken.map(b => `  - ${b.alt || b.src}`).join('\n')}`).toHaveLength(0);
  });

  test('streak stats card loads', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    const readme = page.locator('article.markdown-body, [data-target="readme-toc.content"], .markdown-body').first();
    const streakCard = await readme.evaluate((container) => {
      const imgs = Array.from(container.querySelectorAll('img'));
      const img = imgs.find(i => {
        const src = i.getAttribute('data-canonical-src') || i.src || '';
        return src.includes('streak-stats') || i.alt === 'GitHub Streak';
      });
      if (!img) return null;
      return { loaded: img.complete && img.naturalWidth > 0, naturalWidth: img.naturalWidth };
    });

    console.log(`\n=== Streak card: ${streakCard ? (streakCard.loaded ? '✓ loaded' : '✗ BROKEN') : '✗ NOT FOUND'} ===\n`);
    expect(streakCard, 'Streak card not found in README').not.toBeNull();
    expect(streakCard!.loaded, 'Streak card failed to load').toBe(true);
  });

  test('6 repo pin-cards render via gh-card.dev', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    const readme = page.locator('article.markdown-body, [data-target="readme-toc.content"], .markdown-body').first();
    const pinCards = await readme.evaluate((container) => {
      const imgs = Array.from(container.querySelectorAll('img'));
      return imgs
        .filter(img => {
          const src = img.getAttribute('data-canonical-src') || img.src || '';
          return src.includes('gh-card.dev');
        })
        .map(img => ({
          repo: (img.getAttribute('data-canonical-src') || '').match(/repos\/[^/]+\/([^.]+)/)?.[1] || img.alt,
          loaded: img.complete && img.naturalWidth > 0,
          naturalWidth: img.naturalWidth,
        }));
    });

    console.log(`\n=== Repo pin cards: ${pinCards.length} found, 6 expected ===`);
    pinCards.forEach(c => console.log(`  ${c.loaded ? '✓' : '✗'} ${c.repo} [w=${c.naturalWidth}]`));
    console.log('===================================================\n');

    expect(pinCards, 'Expected exactly 6 repo pin cards').toHaveLength(expected.readme.expectedPinCardCount);
    const broken = pinCards.filter(c => !c.loaded);
    expect(broken, `${broken.length} pin card(s) failed to load`).toHaveLength(0);
  });

  test('lowlighter SVG assets load (at least 4)', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    const readme = page.locator('article.markdown-body, [data-target="readme-toc.content"], .markdown-body').first();
    const svgAssets = await readme.evaluate((container) => {
      const imgs = Array.from(container.querySelectorAll('img'));
      return imgs
        .filter(img => {
          const src = img.getAttribute('data-canonical-src') || img.getAttribute('src') || img.src || '';
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

    console.log(`\n=== Lowlighter SVG assets: ${svgAssets.length} found ===`);
    svgAssets.forEach(a => {
      const name = (a.src || '').split('/').pop() || a.src;
      console.log(`  ${a.loaded ? '✓' : '✗ BROKEN'} ${name} [${a.naturalWidth}x${a.naturalHeight}]`);
    });
    console.log('=====================================================\n');

    expect(svgAssets.length, `Expected >= ${expected.readme.expectedMinSvgAssets} SVG assets`).toBeGreaterThanOrEqual(expected.readme.expectedMinSvgAssets);
    const broken = svgAssets.filter(a => !a.loaded);
    expect(broken, `${broken.length} SVG asset(s) broken`).toHaveLength(0);
  });

  test('contribution snake SVG renders', async ({ page }) => {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    const readme = page.locator('article.markdown-body, [data-target="readme-toc.content"], .markdown-body').first();
    const snake = readme.locator('img[alt*="snake" i], img[src*="snake"]');
    await expect(snake.first()).toBeVisible();
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(10000);
    const { mkdirSync } = await import('fs');
    mkdirSync('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/profile-screenshot.png', fullPage: true });
    console.log('\n📸 Screenshot saved: test-results/profile-screenshot.png\n');
    await context.close();
  });

});
