const puppeteer = require('puppeteer');

async function scrapeUrl(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  const data = await page.evaluate((pageUrl) => {
    // Meta title & description
    const metaTitle = document.title || '';
    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';

    // Total word count (visible text only)
    const bodyText = document.body.innerText || '';
    const totalWordCount = bodyText.split(/\s+/).filter(w => w.length > 0).length;

    // Heading counts (H1–H3)
    const h1Count = document.querySelectorAll('h1').length;
    const h2Count = document.querySelectorAll('h2').length;
    const h3Count = document.querySelectorAll('h3').length;

    // CTAs (buttons and primary action links like [role="button"], .btn, .cta, etc.)
    const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]');
    const ctaLinks = document.querySelectorAll('a.btn, a.cta, a.button, a[class*="btn"], a[class*="cta"], a[class*="button"]');
    const ctaCount = buttons.length + ctaLinks.length;

    // Links — internal vs external
    const hostname = new URL(pageUrl).hostname;
    const allLinks = Array.from(document.querySelectorAll('a[href]'));
    let internalLinks = 0;
    let externalLinks = 0;
    allLinks.forEach(a => {
      try {
        const linkHost = new URL(a.href).hostname;
        if (linkHost === hostname) {
          internalLinks++;
        } else {
          externalLinks++;
        }
      } catch {
        internalLinks++;
      }
    });

    // Images & missing alt text
    const allImages = Array.from(document.querySelectorAll('img'));
    const imageCount = allImages.length;
    const missingAltCount = allImages.filter(img => !img.alt || img.alt.trim() === '').length;
    const missingAltPercent = imageCount > 0 ? Math.round((missingAltCount / imageCount) * 100) : 0;

    return {
      metaTitle,
      metaDescription,
      totalWordCount,
      headings: { h1: h1Count, h2: h2Count, h3: h3Count },
      ctaCount,
      links: { internal: internalLinks, external: externalLinks, total: allLinks.length },
      images: { total: imageCount, missingAlt: missingAltCount, missingAltPercent },
    };
  }, url);

  await browser.close();
  return data;
}

module.exports = { scrapeUrl };
