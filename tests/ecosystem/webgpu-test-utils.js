/**
 * WebGPU test utilities for ecosystem tests
 */
import { test as base, expect } from '@playwright/test';

import { setupWebGPUTest } from '../setup.js';

/**
 * Extended test fixture that includes WebGPU detection
 */
export const test = base.extend({
	// Add a WebGPU fixture that checks for support
	webgpuSupported: async ({ page }, use, testInfo) => {
		const hasWebGPU = await setupWebGPUTest(testInfo, page);
		await use(hasWebGPU);
	},
});

/**
 * Skip a test if WebGPU is not supported
 * @param {import('@playwright/test').TestInfo} testInfo - Test information
 * @param {boolean} webgpuSupported - Whether WebGPU is supported
 * @returns {boolean} - Whether the test was skipped
 */
export function skipWithoutWebGPU(testInfo, webgpuSupported) {
  if (!webgpuSupported) {
		test.skip(true, `Skipping test - WebGPU not supported`);
		return true;
  }
  return false;
}

/**
 * Create a mock WebGPU environment for tests when real WebGPU is unavailable
 * @param {import('@playwright/test').Page} page - Playwright page
 */
export async function setupMockWebGPU(page) {
  await page.evaluate(() => {
		// Only mock if WebGPU is not available
		if (!navigator.gpu) {
			console.log('Setting up mock WebGPU environment for testing');

			// Create a minimal mock implementation
			window.navigator.gpu = {
				requestAdapter: async () => ({
					requestDevice: async () => ({
						createBuffer: () => ({}),
						createShaderModule: () => ({}),
						createComputePipeline: () => ({}),
						queue: {
							writeBuffer: () => {},
							submit: () => {},
						},
						destroy: () => {},
					}),
					features: new Set(),
					limits: {},
				}),
			};

			// Let the app know we're using a mock
			window.__USING_WEBGPU_MOCK__ = true;
		}
  });
}
