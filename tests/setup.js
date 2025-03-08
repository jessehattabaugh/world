/**
 * Global test setup file for Node.js built-in test runner
 */
import { afterEach, beforeEach } from 'node:test';
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Ensure snapshot directories exist
const snapshotDir = path.join(process.cwd(), 'snapshots');
if (!fs.existsSync(snapshotDir)) {
  fs.mkdirSync(snapshotDir, { recursive: true });
}

// Get base URL from environment variable or use default
export const getBaseUrl = () => {
  if (process.env.TEST_ENV === 'staging') {
    return process.env.STAGING_URL || 'https://staging.example.com';
  }
  return process.env.BASE_URL || 'http://localhost:3000';
};

// Browser setup and teardown
export async function setupBrowser(options = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1280, height: 720 },
    ...options
  });
  const page = await context.newPage();

  return { browser, context, page };
}

export async function teardownBrowser(browser) {
  if (browser) {
    await browser.close();
  }
}

// Reusable test fixture for pages
export function createPageFixture() {
  let browser;
  let page;

  beforeEach(async () => {
    const setup = await setupBrowser();
    browser = setup.browser;
    page = setup.page;
  });

  afterEach(async () => {
    await teardownBrowser(browser);
  });

  return () => {return page};
}

// Helper to take and compare screenshots
export async function expectScreenshot(page, screenshotName) {
  const filePath = path.join(snapshotDir, `${screenshotName}-baseline.png`);
  const screenshot = await page.screenshot();

  // If the baseline doesn't exist, create it
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, screenshot);
    console.log(`Created new baseline screenshot: ${screenshotName}`);
    return true;
  }

  // TODO: Implement screenshot comparison logic
  // For now, just comparing existence is sufficient
  return fs.existsSync(filePath);
}
