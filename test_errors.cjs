const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('error', err => console.log('ERROR:', err.toString()));

  await page.goto('http://localhost:5174/');
  await new Promise(r => setTimeout(r, 2000));
  
  // Click employer
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Sign in as Employer')) {
      await btn.click();
      console.log('Clicked Employer login mock button (if exists)');
      break;
    }
  }

  // Wait, the new UI is role select
  // Let's click Employer role
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('EmployerB2BSearch')) {
      await btn.click();
      console.log('Clicked Employer role selection');
      break;
    }
  }

  // Then try to log in
  await new Promise(r => setTimeout(r, 2000));
  const newButtons = await page.$$('button');
  for (const btn of newButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Sign In')) {
      // Actually login requires email and password filling
      // Let's just mock the auth or skip
    }
  }
  
  await browser.close();
})();
