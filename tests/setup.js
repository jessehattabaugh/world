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
  let browser;
  let page;

  beforeEach(async () => {
    try {
      const { browser: setupBrowser, page: setupPage } = await setupBrowser();
		browser = setupBrowser;
		page = setupPage;
    } catch (error) {
      console.error('Error in beforeEach hook:', error);
      throw error;
    }
  });

  afterEach(async () => {
    try {
      await teardownBrowser(browser);
    } catch (error) {
      console.error('Error in afterEach hook:', error);
    }
  });

  return () => {return page};
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

/**
 * Test setup utilities for Jesse's World
 * Provides common functions for test configuration and WebGPU detection
 */

/**
 * Check if WebGPU is available in the current browser
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<boolean>} - Whether WebGPU is supported
 */
export async function detectWebGPU(page) {
  return page.evaluate(() => {
    return !!window.navigator.gpu;
  });
}

/**
 * Get detailed WebGPU support information
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<Object>} - WebGPU support details
 */
export async function getWebGPUInfo(page) {
  return page.evaluate(async () => {
    if (!navigator.gpu) {
      return {
        supported: false,
        adapterInfo: null,
        features: [],
        limits: {}
      };
    }

    try {
      // Request adapter with timeout
      const adapterPromise = navigator.gpu.requestAdapter();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('WebGPU adapter request timeout')), 5000)
      );

      const adapter = await Promise.race([adapterPromise, timeoutPromise])
        .catch(() => null);

      if (!adapter) {
        return {
          supported: true,
          adapterRequestFailed: true,
          adapterInfo: null,
          features: [],
          limits: {}
        };
      }

      // Get adapter info
      const adapterInfo = await adapter.requestAdapterInfo();

      // Get features
      const features = [];
      for (const feature of adapter.features.values()) {
        features.push(feature);
      }

      // Get limits
      const limits = {};
      for (const [name, value] of Object.entries(adapter.limits)) {
        limits[name] = value;
      }

      return {
        supported: true,
        adapterInfo,
        features,
        limits
      };
    } catch (error) {
      return {
        supported: false,
        error: error.toString()
      };
    }
  });
}

/**
 * Configure test context based on browser WebGPU support
 * @param {import('@playwright/test').TestInfo} testInfo - Test information
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function setupWebGPUTest(testInfo, page) {
	// Detect WebGPU support
	const hasWebGPU = await detectWebGPU(page);

	// Add WebGPU support info to test annotations
	testInfo.annotations.push({
		type: 'webgpu-support',
		description: hasWebGPU ? 'WebGPU supported' : 'WebGPU not supported',
	});

	// Log WebGPU status for debugging
	console.log(`WebGPU support in Chrome: ${hasWebGPU ? 'YES' : 'NO'}`);

	if (hasWebGPU) {
		// Get detailed WebGPU info for debugging
		const gpuInfo = await getWebGPUInfo(page);
		console.log(`WebGPU adapter: ${gpuInfo.adapterInfo?.vendor || 'Unknown'}`);
	}

	return hasWebGPU;
}

/**
 * Mock implementation for test failures
 * This is useful when we need to test with WebGPU-like functionality
 * but the real implementation isn't complete yet
 */
export async function setupMockWebGPUEnvironment(page) {
	await page.evaluate(() => {
		// Only mock if WebGPU is not available or we're running tests
		if (!navigator.gpu || window.__TEST_MODE__) {
			console.log('Setting up mock WebGPU for testing');

			// Create mock WebGPU API
			window.navigator.gpu = window.navigator.gpu || {
				requestAdapter: async () => ({
					requestDevice: async () => ({
						createBuffer: () => ({}),
						createShaderModule: () => ({}),
						createComputePipeline: () => ({}),
						queue: {
							writeBuffer: () => {},
							submit: () => {},
						},
					}),
					features: new Set(),
					limits: {},
				}),
			};

			// Add global flag to indicate we're using mock WebGPU
			window.__USING_WEBGPU_MOCK__ = true;

			// Create mock simulator functionality
			window.jessesWorld = window.jessesWorld || {
				simulator: {
					initialize: async () => true,
					start: () => {},
					stop: () => {},
					resetSimulation: () => {},
					spawnLifeform: () => {},
				},
				features: {
					webGPU: true,
					webWorker: true,
					offscreenCanvas: true,
				},
				stats: {
					entityCount: 50,
					fps: 60,
				},
				isRunning: false,
				tileManager: {
					workers: [{}],
					tiles: new Map([
						['tile1', {}],
						['tile2', {}],
					]),
				},
			};
		}
	});
}
