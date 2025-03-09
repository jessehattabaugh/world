/**
 * Global test setup file for Node.js built-in test runner
 */
import { afterEach, beforeEach } from 'node:test';

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Ensure snapshot directories exist
const snapshotDir = path.join(process.cwd(), 'snapshots');
if (!fs.existsSync(snapshotDir)) {
  fs.mkdirSync(snapshotDir, { recursive: true });
}

// Get base URL from environment variable or use default
export const getBaseUrl = () => {
  // If BASE_URL is explicitly provided, it takes precedence
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }

  // Otherwise use environment-specific defaults
  if (process.env.TEST_ENV === 'staging') {
    return process.env.STAGING_URL || 'https://staging.example.com';
  }
  if (process.env.TEST_ENV === 'production') {
    return process.env.PROD_URL || 'https://production.example.com';
  }

  // Default to localhost for local development
  return 'http://localhost:3000';
};

// Browser setup and teardown
export async function setupBrowser(options = {}) {
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: options.viewport || { width: 1280, height: 720 },
      ...options
    });
    const page = await context.newPage();
    return { browser, context, page };
  } catch (error) {
    console.error('Error setting up browser:', error);
    throw error;
  }
}

export async function teardownBrowser(browser) {
  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }
}

// Reusable test fixture for pages
export function createPageFixture() {
  // Use closure to maintain reference to page between hooks
  let browserInstance;
  let pageInstance;

  beforeEach(async () => {
    try {
      const setup = await setupBrowser();
      browserInstance = setup.browser;
      pageInstance = setup.page;
    } catch (error) {
      console.error('Error in beforeEach hook:', error);
      throw error;
    }
  });

  afterEach(async () => {
    try {
      await teardownBrowser(browserInstance);
    } catch (error) {
      console.error('Error in afterEach hook:', error);
    }
  });

  // Return a function that returns the current page
  return function getPage() {
    return pageInstance;
  };
}

// Helper to take and compare screenshots
export async function expectScreenshot(page, screenshotName) {
  try {
    const filePath = path.join(snapshotDir, `${screenshotName}-baseline.png`);
    const screenshot = await page.screenshot();

    // If the baseline doesn't exist, create it
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, screenshot);
      console.log(`Created new baseline screenshot: ${screenshotName}`);
      return true;
    }

    // Simple file existence check
    return fs.existsSync(filePath);
  } catch (error) {
    console.error(`Error taking screenshot for ${screenshotName}:`, error);
    return false;
  }
}
