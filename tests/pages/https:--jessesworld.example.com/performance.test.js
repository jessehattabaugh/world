import { assertPerformanceBaseline, getBrowserPerformanceMetrics } from '../../utils/performance-utils.js';
/**
 * Homepage performance tests
 */
import { expect, test } from '@playwright/test';
import { formatPageId, mapTestUrl } from '../../utils/url-mapping.js';

// Keep original URL as reference for reports, but use the mapped URL for testing
const originalUrl = 'https://jessesworld.example.com/';
const pageUrl = mapTestUrl(originalUrl);
const pageName = 'Homepage';
const pageId = formatPageId(originalUrl);

test.describe('Homepage - Performance', () => {
  // Set up route mocking for any external requests
  test.beforeEach(async ({ page }) => {
    // Route any jessesworld.example.com requests to localhost
    await page.route('**/*.{png,jpg,jpeg,css,js}', route => route.continue());
    await page.route(/https:\/\/jessesworld\.example\.com.*/, route => {
      const url = new URL(route.request().url());
      url.host = 'localhost:3000';
      url.protocol = 'http:';
      return route.continue({ url: url.toString() });
    });
  });

  test('meets performance baseline requirements', async ({ page }) => {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    // Collect browser performance metrics
    const metrics = await getBrowserPerformanceMetrics(page);

    // Compare against baseline
    await assertPerformanceBaseline(pageId, metrics);

    // Assert specific thresholds for critical metrics
    expect(metrics.FCP).toBeLessThan(2000, 'FCP should be under 2 seconds');
    if (metrics.LCP !== undefined) {
      expect(metrics.LCP).toBeLessThan(2500, 'LCP should be under 2.5 seconds');
    }
    if (metrics.CLS !== undefined) {
      expect(metrics.CLS).toBeLessThan(0.1, 'CLS should be under 0.1');
    }
  });
});
