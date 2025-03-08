/**
 * Homepage SEO tests
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createPageFixture, getBaseUrl } from '../../setup.js';

describe('Homepage - SEO', () => {
  const getPage = createPageFixture();

  it('should have proper SEO meta tags', async () => {
    const page = getPage();
    await page.goto(getBaseUrl());

    // Check for essential SEO meta tags
    const metaTags = await page.evaluate(() => {
      return {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
        ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
        ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute('content'),
        ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
        twitterCard: document.querySelector('meta[name="twitter:card"]')?.getAttribute('content')
      };
    });

    // Page should have a title
    assert.ok(metaTags.title && metaTags.title.length > 0, 'Page should have a title');

    // Page should have a meta description
    assert.ok(
      metaTags.description && metaTags.description.length > 0,
      'Page should have a meta description'
    );
  });

  it('should have canonical URL set', async () => {
    const page = getPage();
    await page.goto(getBaseUrl());

    // Check for canonical link
    const canonicalUrl = await page.evaluate(() => {
      return document.querySelector('link[rel="canonical"]')?.getAttribute('href');
    });

    assert.ok(canonicalUrl, 'Page should have a canonical URL');
  });

  it('should have valid heading structure', async () => {
    const page = getPage();
    await page.goto(getBaseUrl());

    // Check for proper heading hierarchy
    const headings = await page.evaluate(() => {
      return {
        h1Count: document.querySelectorAll('h1').length,
        headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => {return {
          level: parseInt(h.tagName.substring(1)),
          text: h.textContent.trim()
        }})
      };
    });

    // Page should have exactly one h1
    assert.strictEqual(headings.h1Count, 1, 'Page should have exactly one h1 heading');

    // Page should have at least one heading
    assert.ok(headings.headings.length > 0, 'Page should have headings');

    // The first heading should be h1
    assert.strictEqual(headings.headings[0].level, 1, 'The first heading should be h1');
  });

  it('should have all images with alt text', async () => {
    const page = getPage();
    await page.goto(getBaseUrl());

    // Check for images without alt text
    const images = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).map(img => {return {
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt'),
        hasAlt: img.hasAttribute('alt')
      }});
    });

    // Skip if there are no images
    if (images.length === 0) {
      console.log('No images found on the page, skipping alt text check');
      return;
    }

    // Check if all images have alt attributes (even if empty for decorative images)
    const imagesWithoutAlt = images.filter(img => {return !img.hasAlt});
    assert.strictEqual(
      imagesWithoutAlt.length,
      0,
      `All images should have alt attributes, found ${imagesWithoutAlt.length} without alt`
    );
  });
});
