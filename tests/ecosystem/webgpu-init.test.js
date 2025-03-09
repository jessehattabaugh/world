// @ts-check
import { expect, test } from '@playwright/test';

/**
 * Tests for WebGPU initialization detection
 * These are basic tests to verify WebGPU support in the browser environment
 */

test.describe('WebGPU Initialization Tests', () => {
  test('should detect WebGPU API in supported browsers', async ({ page, browserName }) => {
    // Skip test for browsers we know don't support WebGPU yet
    test.skip(browserName === 'webkit' || browserName === 'firefox',
      `${browserName} doesn't fully support WebGPU yet`);

    // Navigate to the homepage
    await page.goto('/');

    // Check if WebGPU is detected in the browser
    const hasWebGPU = await page.evaluate(() => {
      return 'gpu' in navigator;
    });

    // Just log the result rather than fail tests in browsers without WebGPU
    console.log(`WebGPU support detected in ${browserName}: ${hasWebGPU}`);

    // For Chromium, we expect WebGPU to be available
    if (browserName === 'chromium') {
      expect(hasWebGPU).toBe(true);
    }
  });

  test('should load our WebGPU canvas in supported browsers', async ({ page, browserName }) => {
    // Skip test for browsers we know don't support WebGPU yet
    test.skip(browserName === 'webkit' || browserName === 'firefox',
      `${browserName} doesn't fully support WebGPU yet`);

    // Navigate to homepage and wait for canvas to be created
    await page.goto('/');
    const canvas = page.locator('#simulator-preview-canvas canvas');

    // Wait for canvas to be visible (even in fallback mode)
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Take a screenshot of the canvas for verification
    await canvas.screenshot({ path: `snapshots/webgpu-canvas-${browserName}.png` });
  });

  test('should enable UI controls after initialization', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Wait for controls to be enabled
    await expect(page.locator('#spawn-life')).not.toBeDisabled({ timeout: 15000 });
    await expect(page.locator('#toggle-simulation')).not.toBeDisabled();
    await expect(page.locator('#reset-preview')).not.toBeDisabled();
  });
});