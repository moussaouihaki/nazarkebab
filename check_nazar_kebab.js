const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://nazar-kebab.vercel.app', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'nazar_screenshot.png' });
  await browser.close();
})();
