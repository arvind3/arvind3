const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  const absPath = path.resolve('test-results/preview.html');
  const fileUrl = 'file:///' + absPath.split('\\').join('/');

  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  if (!fs.existsSync('test-results')) fs.mkdirSync('test-results');
  await page.screenshot({ path: 'test-results/improvement2-preview.png', fullPage: true });
  console.log('Screenshot saved: test-results/improvement2-preview.png');
  await browser.close();
})();
