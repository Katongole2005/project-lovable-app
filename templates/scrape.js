import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning' || msg.type() === 'log') {
      console.log(`PAGE LOG [${msg.type()}]:`, msg.text());
    }
  });

  page.on('pageerror', (err) => {
    console.error('PAGE ERROR:', err.message);
  });

  try {
    await page.goto('http://127.0.0.1:5001', { waitUntil: 'networkidle0', timeout: 30000 });
    console.log("Page loaded successfully.");
    await new Promise(r => setTimeout(r, 2000));
  } catch (error) {
    console.error("Navigation error:", error.message);
  } finally {
    await browser.close();
  }
})();
