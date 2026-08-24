const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('ERROR LOG:', msg.text());
    else console.log('LOG:', msg.text());
  });
  
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('https://nazar-kebab.vercel.app', { waitUntil: 'networkidle0' });
  
  const html = await page.evaluate(() => document.documentElement.outerHTML);
  console.log('HTML LENGTH:', html.length);
  
  await browser.close();
})();
