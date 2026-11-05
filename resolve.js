const puppeteer = require('puppeteer');

(async () => {
  const shareUrl = process.argv[2];
  if (!shareUrl) {
    console.error('Usage: node resolve-zoom.js <share_url>');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  try {
    // Navigate to the share link
    await page.goto(shareUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for the URL to change to a /play/ URL (the SPA redirect)
    await page.waitForFunction(
      () => window.location.href.includes('/rec/play/'),
      { timeout: 30000 }
    );

    const playUrl = page.url();
    console.log(playUrl); // This is what you will pass to zoom-dl
  } catch (err) {
    console.error('Failed to resolve share link:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
