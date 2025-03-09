import { checkForVulnerableLibraries, checkHeaders, testCSP } from '../../utils/security-utils.js';
import { expect, test } from '@playwright/test';
import { formatPageId, mapTestUrl } from '../../utils/url-mapping.js';

// Keep original URL as reference for reports, but use the mapped URL for testing
const originalUrl = 'https://jessesworld.example.com/';
const pageUrl = mapTestUrl(originalUrl);
const pageName = 'Homepage';
const pageId = formatPageId(originalUrl);

test.describe('Homepage - Security', () => {
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

  test('has proper security headers', async ({ request }) => {
    // Test security headers
    const response = await request.get(pageUrl);
    const headers = response.headers();

    const headerChecks = await checkHeaders(headers);
    expect(headerChecks.pass, headerChecks.message).toBeTruthy();
  });

  test('has valid Content-Security-Policy', async ({ page }) => {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    const cspResult = await testCSP(page);
    expect(cspResult.valid, cspResult.message).toBeTruthy();
  });

  test('has no vulnerable libraries', async ({ page }) => {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    const vulnResult = await checkForVulnerableLibraries(page);
    expect(vulnResult.vulnerabilities.length,
      'No vulnerable libraries should be detected').toBe(0);
  });
});
