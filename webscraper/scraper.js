const puppeteer = require('puppeteer');

const M = '';

async function scrapeUrl(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const startTime = Date.now();
  const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  const loadTimeMs = Date.now() - startTime;

  // Response-level data (outside page.evaluate)
  const statusCode = response?.status() || M;
  const headers = response?.headers() || {};
  const cacheControlHeader = headers['cache-control'] || M;

  // Fonts loaded from document
  const fontsLoaded = await page.evaluate(() => {
    const fonts = [];
    const seen = new Set();
    document.fonts.forEach(f => {
      const key = f.family;
      if (!seen.has(key)) {
        seen.add(key);
        fonts.push({ family: f.family.replace(/['"]/g, ''), source: 'document.fonts' });
      }
    });
    Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(link => {
      const href = link.href || '';
      if (href.includes('fonts.googleapis.com')) {
        const match = href.match(/family=([^&:]+)/);
        if (match) {
          match[1].split('|').forEach(fam => {
            const name = decodeURIComponent(fam.replace(/\+/g, ' '));
            if (!seen.has(name)) {
              seen.add(name);
              fonts.push({ family: name, source: 'google-fonts' });
            }
          });
        }
      }
    });
    return fonts;
  });

  const MISSING = '';

  const data = await page.evaluate((pageUrl, M) => {
    // Helper: return value or M if empty
    const v = (val) => (val && val.trim() !== '') ? val : M;

    // Meta title & description
    const metaTitle = v(document.title);
    const metaDescription = v(document.querySelector('meta[name="description"]')?.content);

    // Total word count (visible text only)
    const bodyText = document.body.innerText || '';
    const words = bodyText.split(/\s+/).filter(w => w.length > 0);
    const totalWordCount = words.length;

    // Title tag
    const titleTag = v(document.querySelector('title')?.textContent);

    // H1 tag(s)
    const h1Els = Array.from(document.querySelectorAll('h1'));
    const h1Tags = h1Els.length > 0 ? h1Els.map(h => h.textContent.trim()) : M;

    // Heading hierarchy
    const headingEls = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const headingHierarchy = headingEls.length > 0 ? headingEls.map(h => ({
      tag: h.tagName.toLowerCase(),
      text: h.textContent.trim(),
    })) : M;

    // Heading counts
    const h1Count = document.querySelectorAll('h1').length;
    const h2Count = document.querySelectorAll('h2').length;
    const h3Count = document.querySelectorAll('h3').length;

    // Keyword usage
    const stopWords = new Set(['the','and','for','are','but','not','you','all','can','had','her','was','one','our','out','has','have','been','from','they','will','with','this','that','them','then','than','into','over','such','when','which','their','there','these','those','would','about','could','other','after','being','where','does','just','also','what','some','very','more','most','only','each','both','many','much','make','like','back','well','even','want','give','take','come','made','find','here','know','long','look','part','time','work','used','using','site','page','your','link']);
    const wordFreq = {};
    words.forEach(w => {
      const lower = w.toLowerCase().replace(/[^a-z]/g, '');
      if (lower.length >= 3 && !stopWords.has(lower)) {
        wordFreq[lower] = (wordFreq[lower] || 0) + 1;
      }
    });
    const kwEntries = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const keywordUsage = kwEntries.length > 0 ? kwEntries.map(([word, count]) => ({ word, count })) : M;

    // URL structure
    const parsedUrl = new URL(pageUrl);
    const urlStructure = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      pathname: parsedUrl.pathname,
      params: Object.fromEntries(parsedUrl.searchParams),
      hash: parsedUrl.hash || M,
      isHttps: parsedUrl.protocol === 'https:',
      pathSegments: parsedUrl.pathname.split('/').filter(Boolean),
    };

    // Canonical URL
    const canonicalUrl = v(document.querySelector('link[rel="canonical"]')?.href);

    // Meta robots
    const metaRobots = v(document.querySelector('meta[name="robots"]')?.content);

    // Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
    const ogDesc = document.querySelector('meta[property="og:description"]')?.content;
    const ogImage = document.querySelector('meta[property="og:image"]')?.content;
    const ogUrl = document.querySelector('meta[property="og:url"]')?.content;
    const ogTags = {
      title: v(ogTitle),
      description: v(ogDesc),
      image: v(ogImage),
      url: v(ogUrl),
    };

    // Twitter Card tags
    const twCard = document.querySelector('meta[name="twitter:card"]')?.content;
    const twTitle = document.querySelector('meta[name="twitter:title"]')?.content;
    const twImage = document.querySelector('meta[name="twitter:image"]')?.content;
    const twitterTags = {
      card: v(twCard),
      title: v(twTitle),
      image: v(twImage),
    };

    // JSON-LD structured data
    const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    let jsonLd = M;
    if (jsonLdScripts.length > 0) {
      const parsed = jsonLdScripts.map(script => {
        try {
          const obj = JSON.parse(script.textContent);
          const items = Array.isArray(obj) ? obj : [obj];
          return items.map(item => ({
            type: item['@type'] || M,
            fieldsPresent: Object.keys(item).filter(k => k !== '@context'),
          }));
        } catch {
          return [];
        }
      }).flat();
      jsonLd = parsed.length > 0 ? parsed : M;
    }

    // Hreflang tags
    const hreflangEls = Array.from(document.querySelectorAll('link[hreflang]'));
    const hreflang = hreflangEls.length > 0 ? hreflangEls.map(link => {
      const lang = link.getAttribute('hreflang') || '';
      const parts = lang.split('-');
      return {
        lang: parts[0] || M,
        region: parts[1] || M,
        url: link.href || M,
      };
    }) : M;

    // HTML lang attribute
    const htmlLang = v(document.documentElement.getAttribute('lang'));

    // Viewport tag
    const viewportTag = v(document.querySelector('meta[name="viewport"]')?.content);

    // DOM element count
    const domElementCount = document.querySelectorAll('*').length;

    // Inline styles count
    const inlineStylesCount = document.querySelectorAll('[style]').length;

    // External stylesheets count
    const externalStylesheetsCount = document.querySelectorAll('link[rel="stylesheet"]').length;

    // Inline scripts count
    const inlineScriptsCount = Array.from(document.querySelectorAll('script')).filter(s => !s.src).length;

    // External scripts count
    const externalScriptsCount = Array.from(document.querySelectorAll('script[src]')).length;

    // Favicon present
    const faviconPresent = !!(document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]'));

    // ARIA roles count
    const ariaRolesCount = document.querySelectorAll('[role]').length;

    // ARIA labels count
    const ariaLabelsCount = document.querySelectorAll('[aria-label], [aria-labelledby]').length;

    // Unlabelled inputs count
    const allInputs = Array.from(document.querySelectorAll('input, select, textarea')).filter(el => el.type !== 'hidden');
    const unlabelledInputsCount = allInputs.filter(input => {
      const id = input.id;
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);
      const wrappedInLabel = input.closest('label');
      const hasAriaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
      return !hasLabel && !wrappedInLabel && !hasAriaLabel;
    }).length;

    // Skip navigation present
    const skipNavPresent = !!(document.querySelector('a[href="#main"]') ||
      document.querySelector('a[href="#content"]') ||
      document.querySelector('a[href="#main-content"]') ||
      document.querySelector('.skip-nav, .skip-link, [class*="skip"]'));

    // Tabindex usage
    const tabindexEls = Array.from(document.querySelectorAll('[tabindex]'));
    const tabindexUsage = { positive: 0, zero: 0, negative: 0 };
    tabindexEls.forEach(el => {
      const val = parseInt(el.getAttribute('tabindex'), 10);
      if (val > 0) tabindexUsage.positive++;
      else if (val === 0) tabindexUsage.zero++;
      else tabindexUsage.negative++;
    });

    // CTAs
    const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]');
    const ctaLinks = document.querySelectorAll('a.btn, a.cta, a.button, a[class*="btn"], a[class*="cta"], a[class*="button"]');
    const ctaCount = buttons.length + ctaLinks.length;

    // Links — internal vs external
    const hostname = new URL(pageUrl).hostname;
    const allLinks = Array.from(document.querySelectorAll('a[href]'));
    let internalLinkCount = 0;
    let externalLinkCount = 0;
    const internalLinksList = [];
    const externalLinksList = [];
    allLinks.forEach(a => {
      try {
        const linkHost = new URL(a.href).hostname;
        if (linkHost === hostname) {
          internalLinkCount++;
          internalLinksList.push({ text: a.textContent.trim(), href: a.href });
        } else {
          externalLinkCount++;
          externalLinksList.push({ text: a.textContent.trim(), href: a.href });
        }
      } catch {
        internalLinkCount++;
        internalLinksList.push({ text: a.textContent.trim(), href: a.href });
      }
    });

    // Social media links
    const socialPlatforms = {
      'facebook.com': 'Facebook', 'fb.com': 'Facebook',
      'twitter.com': 'Twitter', 'x.com': 'Twitter',
      'instagram.com': 'Instagram',
      'linkedin.com': 'LinkedIn',
      'youtube.com': 'YouTube', 'youtu.be': 'YouTube',
      'tiktok.com': 'TikTok',
      'pinterest.com': 'Pinterest',
      'reddit.com': 'Reddit',
      'github.com': 'GitHub',
    };
    const socialLinks = [];
    allLinks.forEach(a => {
      try {
        const linkHost = new URL(a.href).hostname.replace('www.', '');
        const platform = socialPlatforms[linkHost];
        if (platform) {
          socialLinks.push({
            platform,
            url: a.href,
            rel: a.getAttribute('rel') || M,
          });
        }
      } catch {}
    });

    // Images & alt text
    const allImages = Array.from(document.querySelectorAll('img'));
    const imageCount = allImages.length;
    const imageAltData = allImages.map(img => ({
      src: img.src || M,
      alt: (img.alt && img.alt.trim()) ? img.alt : M,
      hasAlt: !!(img.alt && img.alt.trim()),
    }));
    const missingAltCount = imageAltData.filter(img => !img.hasAlt).length;
    const missingAltPercent = imageCount > 0 ? Math.round((missingAltCount / imageCount) * 100) : 0;

    // Iframes, videos, audio, forms, tables
    const iframesCount = document.querySelectorAll('iframe').length;
    const videosCount = document.querySelectorAll('video').length;
    const audioCount = document.querySelectorAll('audio').length;
    const formsCount = document.querySelectorAll('form').length;
    const tablesCount = document.querySelectorAll('table').length;

    // Content length
    const contentLength = bodyText.length;

    return {
      url: pageUrl,
      metaTitle,
      metaDescription,
      titleTag,
      h1Tags,
      headingHierarchy,
      keywordUsage,
      urlStructure,
      contentLength,
      totalWordCount,
      headings: { h1: h1Count, h2: h2Count, h3: h3Count },
      ctaCount,
      canonicalUrl,
      metaRobots,
      ogTags,
      twitterTags,
      jsonLd,
      hreflang,
      htmlLang,
      viewportTag,
      domElementCount,
      inlineStylesCount,
      externalStylesheetsCount,
      inlineScriptsCount,
      externalScriptsCount,
      faviconPresent,
      ariaRolesCount,
      ariaLabelsCount,
      unlabelledInputsCount,
      skipNavPresent,
      tabindexUsage,
      iframesCount,
      videosCount,
      audioCount,
      formsCount,
      tablesCount,
      socialLinks,
      links: {
        internal: internalLinkCount,
        external: externalLinkCount,
        total: allLinks.length,
        internalList: internalLinksList.length > 0 ? internalLinksList : M,
        externalList: externalLinksList.length > 0 ? externalLinksList : M,
      },
      images: {
        total: imageCount,
        missingAlt: missingAltCount,
        missingAltPercent,
        details: imageCount > 0 ? imageAltData : M,
      },
    };
  }, url, M);

  // Add response-level data
  data.statusCode = statusCode;
  data.loadTimeMs = loadTimeMs;
  data.cacheControlHeader = cacheControlHeader;
  data.fontsLoaded = fontsLoaded.length > 0 ? fontsLoaded : M;

  await browser.close();
  return data;
}

module.exports = { scrapeUrl };
