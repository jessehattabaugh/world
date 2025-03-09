/**
 * Homepage test suite
 */
import { expect, test } from '@playwright/test';

import { runAccessibilityTests } from '../../utils/accessibility-utils.js';
import { runPerformanceTests } from '../../utils/performance-utils.js';
import { runSecurityTests } from '../../utils/security-utils.js';
import { runVisualTests } from '../../utils/visual-utils.js';

const pageName = 'Homepage';
const pageId = 'https:--jessesworld.example.com';

test.describe('Homepage', () => {
  test('runs all tests', async ({ page, baseURL }) => {
		const response = await page.goto(baseURL);
		expect(response.status()).toBe(200);

		// Basic page structure
		await expect(page).toHaveTitle(/Jesse's World/);
		await expect(page.locator('h1')).toContainText("Jesse's World");

		// Interactive elements
		const canvas = page.locator('#simulator-preview-canvas');
		await expect(canvas).toBeVisible();

		const controls = page.locator('.simulator-controls');
		await expect(controls).toBeVisible();

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
