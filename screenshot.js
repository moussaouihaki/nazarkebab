const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 1024 });
  await page.goto('file://' + __dirname + '/logo.html', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'assets/images/logo.png' });
  await page.screenshot({ path: 'assets/images/splash-icon.png' });
  await page.screenshot({ path: 'assets/images/favicon.png' });
  await page.screenshot({ path: 'public/logo.png' });
  await browser.close();
})();
