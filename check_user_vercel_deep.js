const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    } else {
      console.log('CONSOLE LOG:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR (uncaught exception):', error.message);
  });
  
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText);
  });
  
  page.on('response', response => {
    if (!response.ok()) {
      console.log('RESPONSE NOT OK:', response.url(), response.status());
    }
  });

  await page.goto('https://pokemoons-difzvx0f3-syntalys-tech.vercel.app', { waitUntil: 'networkidle0' });
  await page.waitForTimeout(2000); // Wait extra 2 seconds just in case
  
  // Take a screenshot to see if it's ACTUALLY blank for Puppeteer
  await page.screenshot({ path: 'vercel_screenshot.png' });
  
  await browser.close();
})();
