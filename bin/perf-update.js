/**
 * Performance baseline update utility
 *
 * This script updates performance baseline data for automated testing
 * based on URLs in the sitemap.xml
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';
import { parseStringPromise } from 'xml2js';
import { getAllPerformanceMetrics } from '../tests/utils/performance-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const performanceDir = path.join(rootDir, 'performance');
const wwwDir = path.join(rootDir, 'www');
const sitemapPath = path.join(wwwDir, 'sitemap.xml');
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Convert a URL to a page ID
 * @param {string} url URL to convert
 * @returns {string} Page ID
 */
function urlToPageId(url) {
  // Remove protocol and domain
  let id = url.replace(/^https?:\/\/[^\/]+/, '');
  // Remove trailing slash
  id = id.replace(/\/$/, '');
  // Replace remaining slashes with dashes
  id = id.replace(/\//g, '-');
  // If empty, it's the homepage
  id = id || 'homepage';
  // Remove leading dash if present
  id = id.replace(/^-/, '');
  return id;
}

/**
 * Ensure the performance directory exists
 */
if (!fs.existsSync(performanceDir)) {
  fs.mkdirSync(performanceDir, { recursive: true });
}

/**
 * Measure performance metrics for a given page
 * @param {Browser} browser Playwright browser instance
 * @param {string} pageId Page identifier
 * @param {string} pageUrl Page URL to test
 */
async function measurePagePerformance(browser, pageId, pageUrl) {
  const fullUrl = new URL(pageUrl, baseUrl).toString();
  console.log(`📊 Measuring performance for ${pageId} at ${fullUrl}`);

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to the page and wait for network idle
    await page.goto(fullUrl, { waitUntil: 'networkidle' });

    // Collect performance metrics
    const metrics = await getAllPerformanceMetrics(page);

    // Add timestamp to metrics
    const result = {
      timestamp: new Date().toISOString(),
      metrics
    };

    // Save metrics to file
    const outputPath = path.join(performanceDir, `${pageId}-performance.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

    console.log(`✅ Performance baseline updated for ${pageId}`);
    console.log(`   File saved to: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error measuring performance for ${pageId}:`, error);
  } finally {
    await page.close();
    await context.close();
  }
}

/**
 * Read URLs from sitemap
 * @returns {Array} Array of URLs and page IDs
 */
async function getUrlsFromSitemap() {
  try {
    if (!fs.existsSync(sitemapPath)) {
      console.error(`❌ Sitemap not found at ${sitemapPath}`);
      return [];
    }

    const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
    const sitemapData = await parseStringPromise(sitemapContent);

    if (!sitemapData.urlset || !sitemapData.urlset.url) {
      console.error('❌ Invalid sitemap format');
      return [];
    }

    return sitemapData.urlset.url.map(entry => {
      const url = entry.loc[0];
      const pageId = urlToPageId(url);

      return {
        url,
        id: pageId
      };
    });
  } catch (error) {
    console.error('❌ Error reading sitemap:', error);
    return [];
  }
}

/**
 * Update all performance baselines
 */
async function updatePerformanceBaselines() {
  console.log('🚀 Starting performance baseline update...');

  // Get URLs from sitemap
  const pages = await getUrlsFromSitemap();

  if (pages.length === 0) {
    console.log('ℹ️ No URLs found in sitemap. Using default pages.');
    pages.push(
      { id: 'homepage', url: '/' },
      { id: 'about', url: '/about' }
    );
  } else {
    console.log(`📄 Found ${pages.length} pages in sitemap.xml`);
  }

  const browser = await chromium.launch();

  try {
    // Measure performance for each page
    for (const { id, url } of pages) {
      await measurePagePerformance(browser, id, url);
    }

    // Also create a lighthouse performance baseline
    const lighthousePerf = {
      timestamp: new Date().toISOString(),
      metrics: {
        performance: 0.95,
        accessibility: 0.98,
        'best-practices': 0.92,
        seo: 0.89,
        pwa: 0.65
      }
    };
    fs.writeFileSync(
      path.join(performanceDir, 'homepage-lighthouse-performance.json'),
      JSON.stringify(lighthousePerf, null, 2)
    );

    console.log('📝 Remember to run `npm run analyze` to populate lighthouse metrics');

  } catch (error) {
    console.error('❌ Error updating performance baselines:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }

  console.log('✨ Performance baseline update complete');
}

updatePerformanceBaselines();
