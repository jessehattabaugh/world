import { checkA11y, injectAxe } from '../../utils/accessibility-utils.js';
/**
 * Homepage accessibility tests
 */
import { expect, test } from '@playwright/test';
import { formatPageId, mapTestUrl } from '../../utils/url-mapping.js';

// Keep original URL as reference for reports, but use the mapped URL for testing
const originalUrl = 'https://jessesworld.example.com/';
const pageUrl = mapTestUrl(originalUrl);
const pageName = 'Homepage';
const pageId = formatPageId(originalUrl);

test.describe('Homepage - Accessibility', () => {
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

  test('meets accessibility standards', async ({ page }) => {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    // Inject axe-core library
    await injectAxe(page);

    // Run accessibility tests
    const violations = await checkA11y(page);
    expect(violations.length, 'No accessibility violations').toBe(0);
  });

  test('has proper keyboard navigation', async ({ page }) => {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    // Press Tab to move focus to first interactive element
    await page.keyboard.press('Tab');

    // Check that focus moved from body to an interactive element
    const focusedElement = await page.evaluate(() => {
      return {
        tag: document.activeElement.tagName,
        role: document.activeElement.getAttribute('role'),
        tabIndex: document.activeElement.tabIndex,
      };
    });

    expect(focusedElement.tag).not.toBe('BODY', 'Focus should move from body');
  });
});
