/**
 * Homepage visual tests
 */
import { test, expect } from '@playwright/test';
import { formatPageId, mapTestUrl } from '../../utils/url-mapping.js';

// Keep original URL as reference for reports, but use the mapped URL for testing
const originalUrl = 'https://jessesworld.example.com/';
const pageUrl = mapTestUrl(originalUrl);
const pageName = 'Homepage';
const pageId = formatPageId(originalUrl);

test.describe('Homepage - Visual', () => {
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

    await expect(page).toHaveScreenshot(`${pageId}-desktop.png`, {
      animations: 'disabled',
      mask: [page.locator('.dynamic-content')], // Add locators for dynamic content
    });
  });

  test('matches visual baseline on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    // Wait for any animations to complete
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot(`${pageId}-mobile.png`, {
      animations: 'disabled'
    });
  });
});
