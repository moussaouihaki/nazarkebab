const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  await page.goto('https://nazar-kebab.vercel.app', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));
  const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML || 'NO_ROOT');
  console.log('ROOT HTML:', rootHtml.substring(0, 500));
  await browser.close();
})();
