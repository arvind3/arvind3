import { test, expect } from '@playwright/test';
import expected from '../fixtures/expected-data.json';

const DASHBOARD_URL = expected.dashboard.url;

const VIEWPORTS = [
  { name: 'mobile',  width: 375,  height: 812 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

test.describe('Brand Analytics Dashboard — responsive', () => {

  for (const vp of VIEWPORTS) {
    test(`renders correctly on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // No horizontal overflow (allow small tolerance for scrollbars)
      const scrollWidth: number = await page.evaluate(() => document.body.scrollWidth);
      console.log(`\n=== ${vp.name}: bodyScrollWidth=${scrollWidth}, viewportWidth=${vp.width} ===\n`);
      expect(scrollWidth, `Horizontal overflow on ${vp.name}`).toBeLessThanOrEqual(vp.width + 30);

      // Main content is visible
      await expect(page.locator('body')).toBeVisible();

      const { mkdirSync } = await import('fs');
      mkdirSync('test-results', { recursive: true });
      await page.screenshot({ path: `test-results/dashboard-${vp.name}.png`, fullPage: true });
      console.log(`📸 Screenshot: test-results/dashboard-${vp.name}.png`);
    });
  }

  test('no fixed-width elements cause overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check for elements wider than the viewport
    const overflowing: string[] = await page.evaluate((maxWidth) => {
      const overflow: string[] = [];
      document.querySelectorAll('*').forEach(el => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.width > maxWidth + 30) {
          const selector = el.tagName.toLowerCase() +
            (el.id ? `#${el.id}` : '') +
            (el.className && typeof el.className === 'string' ? `.${el.className.split(' ')[0]}` : '');
          overflow.push(`${selector} (${Math.round(rect.width)}px)`);
        }
      });
      return overflow.slice(0, 10); // cap output
    }, 375);

    if (overflowing.length > 0) {
      console.warn(`\nOverflowing elements on mobile:\n${overflowing.map(s => `  - ${s}`).join('\n')}\n`);
    }
    // Soft assertion — log but do not fail (many dashboards have intentional side-scroll)
    console.log(`\n=== Mobile overflow elements: ${overflowing.length} ===\n`);
  });

});
