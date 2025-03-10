#!/usr/bin/env node

/**
 * Test Scaffold Generator
 *
 * This tool reads sitemap.xml and generates comprehensive test scaffolds
 * for each HTML page, including accessibility, performance, visual, and
 * security tests.
 */

import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { parseStringPromise } from 'xml2js';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const wwwDir = path.join(rootDir, 'www');
const testsDir = path.join(rootDir, 'tests', 'pages');
const sitemapPath = path.join(wwwDir, 'sitemap.xml');

/**
 * Generate a URL-friendly identifier from a URL path
 * @param {string} url URL to convert to an identifier
 * @returns {string} URL-friendly identifier
 */
function urlToId(url) {
  // Remove protocol and domain
  let id = url.replace(/^https?:\/[^/]+/, '');
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
 * Generate a friendly name from a URL path
 * @param {string} url URL to convert to a name
 * @returns {string} Friendly name
 */
function urlToName(url) {
  // Remove protocol and domain
  let name = url.replace(/^https?:\/\/[^\/]+/, '');
  // Remove trailing slash
  name = name.replace(/\/$/, '');
  // If empty, it's the homepage
  name = name || 'Homepage';
  // Split by slashes and take the last part
  const parts = name.split('/').filter(Boolean);
  if (parts.length === 0) {return 'Homepage';}

  // Convert last part to title case
  name = parts[parts.length - 1];
  return name
    .split('-')
    .map(word => {return word.charAt(0).toUpperCase() + word.slice(1)})
    .join(' ');
}

/**
 * Generate test scaffold for a page
 * @param {string} url Page URL
 * @param {string} id Page identifier
 * @param {string} name Page name
 */
async function generateTestScaffold(url, id, name) {
  const pageTestDir = path.join(testsDir, id);
  const testFilePath = path.join(pageTestDir, 'index.test.js');
  const accessibilityTestPath = path.join(pageTestDir, 'accessibility.test.js');
  const performanceTestPath = path.join(pageTestDir, 'performance.test.js');
  const visualTestPath = path.join(pageTestDir, 'visual.test.js');
  const securityTestPath = path.join(pageTestDir, 'security.test.js');

  // Create directory if it doesn't exist
  await fs.mkdir(pageTestDir, { recursive: true });

  // Check if test file already exists
  if (!existsSync(testFilePath)) {
    // Generate main test file
    const mainTest = `/**
 * ${name} page tests
 */
import { test } from '@playwright/test';
import { runAccessibilityTests } from '../../utils/accessibility-utils.js';
import { runPerformanceTests } from '../../utils/performance-utils.js';
import { runVisualTests } from '../../utils/visual-utils.js';
import { runSecurityTests } from '../../utils/security-utils.js';

const pageUrl = '${url}';
const pageName = '${name}';
const pageId = '${id}';

test.describe('${name}', () => {
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
`;
    await fs.writeFile(testFilePath, mainTest);
    console.log(`✓ Created main test file for ${name}`);
  }

  // Generate accessibility test file
  if (!existsSync(accessibilityTestPath)) {
    const accessibilityTest = `/**
 * ${name} accessibility tests
 */
import { test, expect } from '@playwright/test';
import { checkA11y, injectAxe } from '../../utils/accessibility-utils.js';

const pageUrl = '${url}';
const pageName = '${name}';
const pageId = '${id}';

test.describe('${name} - Accessibility', () => {
  test('meets accessibility standards', async ({ page }) => {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });
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
`;
    await fs.writeFile(accessibilityTestPath, accessibilityTest);
    console.log(`✓ Created accessibility test for ${name}`);
  }

  // Generate performance test file
  if (!existsSync(performanceTestPath)) {
    const performanceTest = `/**
 * ${name} performance tests
 */
import { test, expect } from '@playwright/test';
import { getBrowserPerformanceMetrics, assertPerformanceBaseline } from '../../utils/performance-utils.js';

const pageUrl = '${url}';
const pageName = '${name}';
const pageId = '${id}';

test.describe('${name} - Performance', () => {
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
`;
    await fs.writeFile(performanceTestPath, performanceTest);
    console.log(`✓ Created performance test for ${name}`);
  }

  // Generate visual test file
  if (!existsSync(visualTestPath)) {
    const visualTest = `/**
 * ${name} visual tests
 */
import { test, expect } from '@playwright/test';

const pageUrl = '${url}';
const pageName = '${name}';
const pageId = '${id}';

test.describe('${name} - Visual', () => {
  test('matches visual baseline', async ({ page }) => {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    // Wait for any animations to complete
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot(\`\${pageId}-desktop.png\`, {
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

    await expect(page).toHaveScreenshot(\`\${pageId}-mobile.png\`, {
      animations: 'disabled'
    });
  });
});
`;
    await fs.writeFile(visualTestPath, visualTest);
    console.log(`✓ Created visual test for ${name}`);
  }

  // Generate security test file
  if (!existsSync(securityTestPath)) {
    const securityTest = `/**
 * ${name} security tests
 */
import { test, expect } from '@playwright/test';
import { checkHeaders, testCSP, checkForVulnerableLibraries } from '../../utils/security-utils.js';

const pageUrl = '${url}';
const pageName = '${name}';
const pageId = '${id}';

test.describe('${name} - Security', () => {
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
`;
    await fs.writeFile(securityTestPath, securityTest);
    console.log(`✓ Created security test for ${name}`);
  }
}

/**
 * Main function to read sitemap and generate test scaffolds
 */
async function main() {
  try {
    // Check if sitemap exists
    if (!existsSync(sitemapPath)) {
      console.error('❌ sitemap.xml not found at', sitemapPath);
      process.exit(1);
    }

    console.log('📖 Reading sitemap.xml...');
    const sitemapContent = await fs.readFile(sitemapPath, 'utf-8');

    // Parse XML
    const sitemapData = await parseStringPromise(sitemapContent);

    // Extract URLs from sitemap
    const urls = sitemapData.urlset?.url || [];
    if (!urls.length) {
      console.error('❌ No URLs found in sitemap.xml');
      process.exit(1);
    }

    console.log(`🌐 Found ${urls.length} URLs in sitemap.xml`);

    // Generate test scaffolds for each URL
    const generatePromises = urls.map(urlEntry => {
      const [url] = urlEntry.loc;
      const baseUrl = url.replace(/^https?:\/[^/]+/, '');
      const id = urlToId(baseUrl);
      const name = urlToName(baseUrl);

      console.log(`🔍 Processing: ${name} (${baseUrl})`);
      return generateTestScaffold(baseUrl, id, name);
    });

    await Promise.all(generatePromises);

    console.log('✅ Test scaffold generation complete!');
    console.log(`📁 Tests created in: ${testsDir}`);
  } catch (error) {
    console.error('❌ Error generating test scaffolds:', error);
    process.exit(1);
  }
}

// Run the main function
main();
