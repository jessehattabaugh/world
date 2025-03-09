/**
 * About visual tests
 */
import { test, expect } from '@playwright/test';

const pageUrl = 'https://jessesworld.example.com/about';
const pageName = 'About';
const pageId = 'https:--jessesworld.example.com-about';

test.describe('About - Visual', () => {
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
