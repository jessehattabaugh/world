// @ts-check
import { expect, test } from '@playwright/test';
import { requireWebGPU, verifyWebGPUInitialized } from './webgpu-test-utils.js';

/**
 * WebGPU Initialization Tests
 *
 * These tests validate that WebGPU initializes correctly in Chrome
 */

test.describe('WebGPU Initialization Tests', () => {
  // Set a longer timeout for WebGPU initialization which can take time
  test.setTimeout(30000);

  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Verify WebGPU is available and initialized
    await verifyWebGPUInitialized(page);
  });

  test('should load our WebGPU canvas in Chromium', async ({ page }) => {
    // Wait for canvas to be available
    await page.waitForSelector('#simulator-preview-canvas canvas', {
      state: 'attached',
      timeout: 10000
    });

    // Check that canvas is visible
    const canvas = page.locator('#simulator-preview-canvas canvas');
    await expect(canvas).toBeVisible();
  });

  test('should enable UI controls after initialization', async ({ page }) => {
    // Wait for UI controls to be enabled - we use a timeout to allow for initialization
    await expect(page.locator('#spawn-life')).not.toBeDisabled({timeout: 15000});
    await expect(page.locator('#toggle-simulation')).not.toBeDisabled({timeout: 5000});
    await expect(page.locator('#reset-preview')).not.toBeDisabled({timeout: 5000});
  });

  test('should show WebGPU status in compatibility notice', async ({ page }) => {
    // Get the compatibility notice element
    const notice = page.locator('#compatibility-notice');

    // Since we require WebGPU, we should always see the supported message
    await expect(notice).toContainText('supports WebGPU', { timeout: 10000 });
  });

  test('should have global access to jessesWorld object', async ({ page }) => {
    // Wait for initialization to complete
    await page.waitForFunction(() => window.jessesWorld !== undefined, { timeout: 15000 });

    // Verify that jessesWorld object is accessible
    const hasJessesWorld = await page.evaluate(() => {
      return typeof window.jessesWorld === 'object' &&
             window.jessesWorld !== null;
    });

    expect(hasJessesWorld).toBeTruthy();
  });

  test('should initialize WebGPU adapter and device', async ({ page }) => {
    // Check that WebGPU was properly initialized
    const webgpuStatus = await page.evaluate(async () => {
      if (!window.jessesWorld?.simulator) {
        return { initialized: false, error: 'Simulator not found' };
      }

      return {
        initialized: true,
        hasAdapter: !!window.jessesWorld.simulator.adapter,
        hasDevice: !!window.jessesWorld.simulator.device,
        features: Array.from(window.jessesWorld.simulator.adapter?.features || [])
      };
    });

    expect(webgpuStatus.initialized).toBe(true);
    expect(webgpuStatus.hasAdapter).toBe(true);
    expect(webgpuStatus.hasDevice).toBe(true);
  });
});