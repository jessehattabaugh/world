import { checkA11y, injectAxe } from '../../utils/accessibility-utils.js';
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

    // Run axe accessibility tests
    const violations = await checkA11y(page);
    expect(violations.length, 'No accessibility violations should be detected').toBe(0);
  });

  test('has proper keyboard navigation', async ({ page }) => {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // Verify focus is visible
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName !== 'BODY';
    });

    expect(focusedElement, 'An element should be focused after pressing Tab').toBeTruthy();
  });
});
