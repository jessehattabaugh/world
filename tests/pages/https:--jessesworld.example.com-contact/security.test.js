/**
 * Contact security tests
 */
import { test, expect } from '@playwright/test';
import { checkHeaders, testCSP, checkForVulnerableLibraries } from '../../utils/security-utils.js';

const pageUrl = 'https://jessesworld.example.com/contact';
const pageName = 'Contact';
const pageId = 'https:--jessesworld.example.com-contact';

test.describe('Contact - Security', () => {
  test('has proper security headers', async ({ page, request }) => {
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
