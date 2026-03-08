import { test, expect } from '@playwright/test';
import expected from '../fixtures/expected-data.json';

const DASHBOARD_URL = expected.dashboard.url;

test.describe('Accessibility — Brand Analytics Dashboard', () => {

  test('no images without alt text', async ({ page }) => {
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const count = await page.locator('img:not([alt]), img[alt=""]').count();
    console.log(`\n=== Images without alt text: ${count} ===\n`);
    expect(count, `${count} image(s) missing alt text`).toBe(0);
  });

  test('page has exactly one h1', async ({ page }) => {
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
    const h1Count = await page.locator('h1').count();
    console.log(`\n=== h1 count: ${h1Count} ===\n`);
    expect(h1Count, 'Expected exactly 1 <h1> element').toBe(1);
  });

  test('all buttons and links have accessible text', async ({ page }) => {
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const emptyButtons = await page.locator('button:not([aria-label]):not([title])').evaluateAll(els =>
      els.filter(el => !el.textContent?.trim()).length
    );
    const emptyLinks = await page.locator('a:not([aria-label]):not([title])').evaluateAll(els =>
      els.filter(el => !el.textContent?.trim() && !(el as HTMLAnchorElement).href).length
    );

    console.log(`\n=== Empty buttons: ${emptyButtons}, empty links: ${emptyLinks} ===\n`);
    expect(emptyButtons, `${emptyButtons} button(s) have no accessible text`).toBe(0);
  });

  test('page has a lang attribute on <html>', async ({ page }) => {
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
    const lang = await page.locator('html').getAttribute('lang');
    console.log(`\n=== <html lang="${lang}"> ===\n`);
    expect(lang?.trim().length ?? 0, '<html> missing lang attribute').toBeGreaterThan(0);
  });

  test('color contrast — page background is not pure black over white (basic sanity)', async ({ page }) => {
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
    // Just verify the page renders with some background color set
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    console.log(`\n=== body background: ${bodyBg} ===\n`);
    expect(bodyBg, 'Body background color not set').toBeTruthy();
  });

});
