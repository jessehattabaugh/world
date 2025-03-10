// @ts-check
import { expect, test } from '@playwright/test';
import { join } from 'path';
import fs from 'fs';

/**
 * Tests for Chunk Worker functionality
 * These tests verify that the chunk worker correctly handles WebGPU initialization,
 * entity simulation, and communication with the main thread
 */
test.describe('Chunk Worker Tests', () => {
  test('should initialize chunk worker with correct features', async ({ page, browserName }) => {
    // Skip test for browsers we know don't support WebGPU yet
    test.skip(browserName === 'webkit' || browserName === 'firefox',
      `${browserName} doesn't fully support WebGPU yet`);
    
    // Navigate to the ecosystem simulator page
    await page.goto('/ecosystem.html');
    
    // Wait for initialization to complete
    await expect(page.locator('#status-indicator')).toHaveText(/initialized/i, { timeout: 15000 });
    
    // Check if workers were initialized with correct features
    const workerInitialized = await page.evaluate(() => {
      return window.simulationController?.workersInitialized || false;
    });
    
    expect(workerInitialized).toBe(true);
    
    // Verify the features supported in workers through the UI
    if (browserName === 'chromium') {
      await expect(page.locator('#webgpu-status')).toContainText('Enabled', { timeout: 5000 });
    }
  });

  test('should correctly assign chunk to worker and initialize it', async ({ page, browserName }) => {
    // Skip test for browsers we know don't support WebGPU yet
    test.skip(browserName === 'webkit' || browserName === 'firefox',
      `${browserName} doesn't fully support WebGPU yet`);
    
    // Navigate to the ecosystem simulator page
    await page.goto('/ecosystem.html');
    
    // Wait for initialization to complete
    await expect(page.locator('#status-indicator')).toHaveText(/initialized/i, { timeout: 15000 });
    
    // Check for chunk assignment success message in logs
    await expect(page.locator('#simulator-logs')).toContainText('Chunk assigned', { timeout: 10000 });
    
    // Verify chunks are created and ready through the simulation controller
    const chunksReady = await page.evaluate(() => {
      return window.simulationController?.getReadyChunkCount() > 0 || false;
    });
    
    expect(chunksReady).toBe(true);
  });

  test('should spawn and simulate entities within chunks', async ({ page, browserName }) => {
    // Skip test for browsers we know don't support WebGPU yet
    test.skip(browserName === 'webkit' || browserName === 'firefox',
      `${browserName} doesn't fully support WebGPU yet`);
    
    // Navigate to the ecosystem simulator page
    await page.goto('/ecosystem.html');
    
    // Wait for initialization to complete
    await expect(page.locator('#status-indicator')).toHaveText(/initialized/i, { timeout: 15000 });
    
    // Spawn some test entities
    await page.locator('#spawn-random-entities').click();
    
    // Wait for entities to be created
    await page.waitForTimeout(1000);
    
    // Check that entities exist in the simulation
    const entityCount = await page.evaluate(() => {
      return window.simulationController?.getTotalEntityCount() || 0;
    });
    
    expect(entityCount).toBeGreaterThan(0);
    
    // Start the simulation
    await page.locator('#start-simulation').click();
    
    // Wait for a few frames of simulation
    await page.waitForTimeout(2000);
    
    // Check that entities have been updated (positions changed)
    const entitiesMoved = await page.evaluate(() => {
      return window.simulationController?.haveEntitiesMoved() || false;
    });
    
    expect(entitiesMoved).toBe(true);
    
    // Capture a screenshot of the simulation for visual verification
    await page.locator('#ecosystem-display').screenshot({ 
      path: `test-results/ecosystem-simulation-${browserName}.png` 
    });
  });

  test('should handle chunk reset correctly', async ({ page, browserName }) => {
    // Skip test for browsers we know don't support WebGPU yet
    test.skip(browserName === 'webkit' || browserName === 'firefox',
      `${browserName} doesn't fully support WebGPU yet`);
    
    // Navigate to the ecosystem simulator page
    await page.goto('/ecosystem.html');
    
    // Wait for initialization to complete
    await expect(page.locator('#status-indicator')).toHaveText(/initialized/i, { timeout: 15000 });
    
    // Spawn some test entities
    await page.locator('#spawn-random-entities').click();
    
    // Wait for entities to be created
    await page.waitForTimeout(1000);
    
    // Get initial entity count
    const initialEntityCount = await page.evaluate(() => {
      return window.simulationController?.getTotalEntityCount() || 0;
    });
    
    expect(initialEntityCount).toBeGreaterThan(0);
    
    // Reset the simulation
    await page.locator('#reset-simulation').click();
    
    // Wait for reset to complete
    await page.waitForTimeout(1000);
    
    // Check that entities were cleared
    const finalEntityCount = await page.evaluate(() => {
      return window.simulationController?.getTotalEntityCount() || 0;
    });
    
    expect(finalEntityCount).toBe(0);
    
    // Verify reset message appears in logs
    await expect(page.locator('#simulator-logs')).toContainText('reset', { timeout: 5000 });
  });
});