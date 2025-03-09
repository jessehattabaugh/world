import { formatPageId, mapTestUrl } from '../../utils/url-mapping.js';

import { runAccessibilityTests } from '../../utils/accessibility-utils.js';
import { runPerformanceTests } from '../../utils/performance-utils.js';
import { runSecurityTests } from '../../utils/security-utils.js';
import { runVisualTests } from '../../utils/visual-utils.js';
/**
 * Contact page tests
 */
import { test } from '@playwright/test';

// Keep original URL as reference for reports, but use the mapped URL for testing
const originalUrl = 'https://jessesworld.example.com/contact';
const pageUrl = mapTestUrl(originalUrl);
const pageName = 'Contact';
const pageId = formatPageId(originalUrl);

test.describe('Contact', () => {
  // Set up route mocking for any external requests
  test.beforeEach(async ({ page, context }) => {
    // Route any jessesworld.example.com requests to localhost
    await page.route('**/*.{png,jpg,jpeg,css,js}', route => route.continue());
    await page.route(/https:\/\/jessesworld\.example\.com.*/, route => {
      const url = new URL(route.request().url());
      url.host = 'localhost:3000';
      url.protocol = 'http:';
      return route.continue({ url: url.toString() });
    });
  });

  test('runs all tests', async ({ page }) => {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    // This test orchestrates all the individual test types
    // Each test module handles its own reporting and assertions
    test.info().annotations.push({ type: 'page', description: pageName });

    // Run all test types in sequence
    await runAccessibilityTests(page, pageId);
    await runPerformanceTests(page, pageId);
    await runVisualTests(page, pageId);
    await runSecurityTests(page, pageId);
  });
});
