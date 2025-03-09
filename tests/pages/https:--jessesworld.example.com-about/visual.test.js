/**
 * About visual tests
 */
import { expect, test } from '@playwright/test';
import { formatPageId, mapTestUrl } from '../../utils/url-mapping.js';

// Keep original URL as reference for reports, but use the mapped URL for testing
const originalUrl = 'https://jessesworld.example.com/about';
const pageUrl = mapTestUrl(originalUrl);
const pageName = 'About';
const pageId = formatPageId(originalUrl);

test.describe('About - Visual', () => {
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

  test('matches visual baseline', async ({ page }) => {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    // Wait for any animations to complete
    await page.waitForTimeout(500);

    // Get current date for snapshot update detection
    const updateDate = new Date().toISOString().split('T')[0];

    // Take a screenshot and compare with baseline
    await expect(page).toHaveScreenshot(`${pageId}-desktop-${updateDate}.png`, {
      animations: 'disabled',
      mask: [page.locator('.dynamic-content').or(page.locator('.date'))] // Mask dynamic content
    });
  });

  test('matches visual baseline on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    // Wait for any animations to complete
    await page.waitForTimeout(500);

    // Get current date for snapshot update detection
    const updateDate = new Date().toISOString().split('T')[0];

    // Take a screenshot and compare with baseline
    await expect(page).toHaveScreenshot(`${pageId}-mobile-${updateDate}.png`, {
      animations: 'disabled',
      mask: [page.locator('.dynamic-content').or(page.locator('.date'))] // Mask dynamic content
    });
  });
});
