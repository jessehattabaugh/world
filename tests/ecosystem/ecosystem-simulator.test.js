// @ts-check
import { expect, test } from '@playwright/test';

/**
 * Tests for the Jesse's World WebGPU Ecosystem Simulator
 * These tests validate Milestone 1: Infrastructure & WebGPU
 */

// Test the ecosystem simulator initialization and functionality
test.describe('Ecosystem Simulator - Milestone 1', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage where the simulator is embedded
    await page.goto('/');

    // Wait for the simulator canvas to be available
    await page.waitForSelector('#simulator-preview-canvas canvas', { state: 'attached', timeout: 10000 });
  });

  test('should initialize simulator and enable UI controls', async ({ page }) => {
    // Check that simulator UI controls are enabled
    await expect(page.locator('#spawn-life')).not.toBeDisabled({ timeout: 15000 });
    await expect(page.locator('#toggle-simulation')).not.toBeDisabled({ timeout: 5000 });
    await expect(page.locator('#reset-preview')).not.toBeDisabled({ timeout: 5000 });
  });

  test('should detect WebGPU when available', async ({ page, browserName }) => {
    // Check for compatibility notice - this test will be skipped if the browser doesn't support WebGPU
    const hasWebGPU = await page.evaluate(() => 'gpu' in navigator);

    if (hasWebGPU) {
      // If WebGPU is supported, we should see a success message
      const compatNotice = await page.locator('#compatibility-notice');
      await expect(compatNotice).toContainText('supports WebGPU', { timeout: 5000 });
    } else {
      test.skip(browserName + ' does not support WebGPU');
    }
  });

  test('should spawn entities when button is clicked', async ({ page }) => {
    // Click the spawn button
    await page.click('#spawn-life');

    // Use page evaluation to check if entities were created
    const entityCount = await page.evaluate(() => {
      return window.jessesWorld?.stats?.entityCount || 0;
    });

    // We expect entities to be spawned (default is 50)
    expect(entityCount).toBeGreaterThan(0);
  });

  test('should start and stop simulation when toggle button is clicked', async ({ page }) => {
    // First check that simulation is not running initially
    let isSimulationRunning = await page.evaluate(() => {
      return window.jessesWorld?.isRunning || false;
    });
    expect(isSimulationRunning).toBe(false);

    // Click the toggle button to start
    await page.click('#toggle-simulation');

    // Wait a moment for the simulation to start
    await page.waitForTimeout(500);

    // Check that simulation is now running
    isSimulationRunning = await page.evaluate(() => {
      return window.jessesWorld?.isRunning || false;
    });
    expect(isSimulationRunning).toBe(true);

    // Click the toggle button again to stop
    await page.click('#toggle-simulation');

    // Wait a moment for the simulation to stop
    await page.waitForTimeout(500);

    // Check that simulation is now stopped
    isSimulationRunning = await page.evaluate(() => {
      return window.jessesWorld?.isRunning || false;
    });
    expect(isSimulationRunning).toBe(false);
  });

  test('should reset simulation when reset button is clicked', async ({ page }) => {
    // First spawn some entities
    await page.click('#spawn-life');

    // Get initial entity count
    const initialEntityCount = await page.evaluate(() => {
      return window.jessesWorld?.stats?.entityCount || 0;
    });
    expect(initialEntityCount).toBeGreaterThan(0);

    // Click reset button
    await page.click('#reset-preview');

    // Wait a moment for the reset to complete
    await page.waitForTimeout(500);

    // Check that entities were removed
    const finalEntityCount = await page.evaluate(() => {
      return window.jessesWorld?.stats?.entityCount || 0;
    });
    expect(finalEntityCount).toBe(0);
  });

  test('should render the simulator canvas properly', async ({ page }) => {
    // Take a screenshot of the simulator for visual comparison
    const canvas = await page.locator('#simulator-preview-canvas');

    // Verify simulator canvas is visible and has dimensions
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox.width).toBeGreaterThan(0);
    expect(canvasBox.height).toBeGreaterThan(0);

    // Take a screenshot for visual verification
    await canvas.screenshot({ path: 'snapshots/ecosystem-simulator.png' });
  });
});

// Tests for the Web Worker and OffscreenCanvas infrastructure
test.describe('Web Workers & OffscreenCanvas - Milestone 1', () => {
  test('should initialize Web Workers in the background', async ({ page }) => {
    await page.goto('/');

    // Wait for simulator to initialize
    await page.waitForSelector('#simulator-preview-canvas canvas', { state: 'attached', timeout: 10000 });

    // Check that web workers were initialized
    const workerCount = await page.evaluate(() => {
      return window.jessesWorld?.tileManager?.workers?.length || 0;
    });

    // Expect at least one worker to be initialized
    expect(workerCount).toBeGreaterThan(0);
  });

  test('should create multiple tiles for distributed processing', async ({ page }) => {
    await page.goto('/');

    // Wait for simulator to initialize
    await page.waitForSelector('#simulator-preview-canvas canvas', { state: 'attached', timeout: 10000 });

    // Check that tiles were created
    const tileCount = await page.evaluate(() => {
      return window.jessesWorld?.tileManager?.tiles?.size || 0;
    });

    // Expect multiple tiles to be created (our configuration uses 200px tile size in an 800x500 canvas)
    expect(tileCount).toBeGreaterThan(1);
  });
});

// Tests for WebGPU feature detection and fallbacks
test.describe('WebGPU Feature Detection - Milestone 1', () => {
  test('should detect WebGPU availability and features', async ({ page }) => {
    await page.goto('/');

    // Wait for simulator to initialize
    await page.waitForSelector('#simulator-preview-canvas canvas', { state: 'attached', timeout: 10000 });

    // Get WebGPU feature detection
    const features = await page.evaluate(() => {
      return {
        webGPU: window.jessesWorld?.features?.webGPU || false,
        offscreenCanvas: window.jessesWorld?.features?.offscreenCanvas || false,
        webWorker: window.jessesWorld?.features?.webWorker || false
      };
    });

    // Log the detected features for debugging
    console.log('Detected features:', features);

    // Expect Web Workers to be supported (this should be available in all test browsers)
    expect(features.webWorker).toBe(true);
  });

  test('should show appropriate WebGPU warning dialog for unsupported browsers', async ({ page, browserName }) => {
    await page.goto('/');

    const hasWebGPU = await page.evaluate(() => 'gpu' in navigator);

    if (!hasWebGPU) {
      // If WebGPU is not supported, we should see a warning dialog
      const warningDialog = page.locator('#webgpu-warning');
      await expect(warningDialog).toBeVisible();

      // Close the dialog
      await page.click('#close-warning');

      // Verify dialog is closed
      await expect(warningDialog).not.toBeVisible();
    } else {
      // Skip test if browser supports WebGPU
      test.skip(browserName + ' supports WebGPU, skipping warning dialog test');
    }
  });
});