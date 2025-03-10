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

		// Throw an error if WebGPU is not supported
		if (!hasWebGPU) {
			throw new Error(
				'WebGPU is required for these tests but not supported in the current browser',
			);
		}

		await use(true); // Always true since we throw if not supported
	},
});

/**
 * Skip a test if WebGPU is not supported - now throws an error instead
 * @param {import('@playwright/test').TestInfo} testInfo - Test information
 * @param {boolean} webgpuSupported - Whether WebGPU is supported
 * @returns {boolean} - Whether the test was skipped
 */
export function requireWebGPU(testInfo, webgpuSupported) {
	if (!webgpuSupported) {
		throw new Error(
			`WebGPU is required for test '${testInfo.title}' but not supported in the current browser`,
		);
	}
	return false;
}

/**
 * Check that WebGPU is initialized correctly
 * @param {import('@playwright/test').Page} page - Playwright page
 */
export async function verifyWebGPUInitialized(page) {
	// Verify that WebGPU is available
	const hasWebGPU = await page.evaluate(() => {
		return !!navigator.gpu;
	});

	if (!hasWebGPU) {
		throw new Error('WebGPU is not available in the browser');
	}

	// Verify that an adapter can be requested
	const hasAdapter = await page.evaluate(async () => {
		try {
			const adapter = await navigator.gpu.requestAdapter();
			return !!adapter;
		} catch (e) {
			return false;
		}
	});

	if (!hasAdapter) {
		throw new Error('Failed to request WebGPU adapter');
	}

	return true;
}
