const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
  await page.goto('http://localhost:8082/admin', { waitUntil: 'domcontentloaded' });
  
  console.log('Clicking MENU tab...');
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*'));
    const menuEl = els.find(el => el.textContent && el.textContent.includes('Menu & Stock'));
    console.log(menuEl ? 'Found MENU tab' : 'MENU tab NOT FOUND');
    if (menuEl) menuEl.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('PAGE TEXT AFTER CLICK:', pageText);
  await browser.close();
})();
