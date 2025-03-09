import { test, expect } from '@playwright/test';
import { writeFileSync } from 'fs';

// Performance thresholds
const PERF_THRESHOLDS = {
  minFps: 30,
  maxFrameTime: 33.33, // ~30fps in ms
  maxGpuMemory: 512 * 1024 * 1024, // 512MB
  maxEntitySpawnTime: 100, // ms
  targetEntityCount: 1000
};

test.describe('Ecosystem Performance Tests', () => {
  test('should maintain target FPS with maximum entities', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Initialize performance observer
    await page.evaluate(() => {
      window.frameTimings = [];
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        window.frameTimings.push(...entries.map(e => {return e.duration}));
      });
      observer.observe({ entryTypes: ['measure'] });
    });

    // Spawn entities gradually and measure performance
    const results = await page.evaluate(async (threshold) => {
      const sim = window.jessesWorld.simulator;
      const measurements = [];

      // Spawn entities in batches
      for (let i = 0; i < threshold.targetEntityCount; i += 100) {
        const spawnStart = performance.now();

        // Spawn batch of 100 entities
        for (let j = 0; j < 100; j++) {
          sim.spawnLifeform();
        }

        const spawnTime = performance.now() - spawnStart;

        // Run simulation for a few frames to stabilize
        await new Promise(r => {return setTimeout(r, 1000)});

        // Measure performance
        const stats = sim.getStats();
        measurements.push({
          entityCount: stats.entityCount,
          fps: stats.fps,
          frameTime: stats.frameTime,
          spawnTime,
          gpuMemory: stats.gpuMemory || 0
        });
      }

      return measurements;
    }, PERF_THRESHOLDS);

    // Analyze results
    const violations = results.filter(m =>
      {return m.fps < PERF_THRESHOLDS.minFps ||
      m.frameTime > PERF_THRESHOLDS.maxFrameTime ||
      m.gpuMemory > PERF_THRESHOLDS.maxGpuMemory ||
      m.spawnTime > PERF_THRESHOLDS.maxEntitySpawnTime}
    );

    // Save performance results
    writeFileSync(
      'performance-test-results.json',
      JSON.stringify({
        results,
        violations,
        thresholds: PERF_THRESHOLDS
      }, null, 2)
    );

    // Assert performance requirements are met
    expect(violations.length).toBe(0,
      `Found ${violations.length} performance threshold violations`
    );
  });

  test('should efficiently handle worker thread scaling', async ({ page }) => {
    await page.goto('http://localhost:3000');

    const workerScalingResults = await page.evaluate(async () => {
      const sim = window.jessesWorld.simulator;
      const results = [];

      // Test different worker counts
      for (let workers = 1; workers <= 8; workers *= 2) {
        sim.resetSimulation();
        sim.setWorkerCount(workers);

        // Spawn test entities
        for (let i = 0; i < 500; i++) {
          sim.spawnLifeform();
        }

        // Run simulation and measure
        sim.start();
        await new Promise(r => {return setTimeout(r, 5000)});

        const stats = sim.getStats();
        results.push({
          workerCount: workers,
          fps: stats.fps,
          frameTime: stats.frameTime,
          entityCount: stats.entityCount
        });

        sim.stop();
      }

      return results;
    });

    // Verify worker scaling efficiency
    for (let i = 1; i < workerScalingResults.length; i++) {
      const scalingFactor = workerScalingResults[i].workerCount /
                           workerScalingResults[i-1].workerCount;
      const speedupFactor = workerScalingResults[i].fps /
                           workerScalingResults[i-1].fps;

      // We expect at least 50% scaling efficiency
      expect(speedupFactor / scalingFactor).toBeGreaterThan(0.5);
    }
  });

  test('should efficiently handle WebGPU compute scaling', async ({ page }) => {
    test.skip(!await page.evaluate(() => {return 'gpu' in navigator}),
      'WebGPU not supported in this browser');

    await page.goto('http://localhost:3000');

    const gpuScalingResults = await page.evaluate(async () => {
      const sim = window.jessesWorld.simulator;
      const results = [];

      // Test different workgroup sizes
      const workgroupSizes = [32, 64, 128, 256];
      for (const size of workgroupSizes) {
        sim.resetSimulation();
        sim.setComputeConfig({ workgroupSize: size });

        // Spawn test entities
        for (let i = 0; i < 1000; i++) {
          sim.spawnLifeform();
        }

        // Run and measure
        sim.start();
        await new Promise(r => {return setTimeout(r, 5000)});

        const stats = sim.getStats();
        const gpuStats = sim.gpuManager.getStats();

        results.push({
          workgroupSize: size,
          fps: stats.fps,
          computeTime: gpuStats.computeTime,
          gpuMemory: gpuStats.memoryUsage
        });

        sim.stop();
      }

      return results;
    });

    // Find optimal workgroup size
    const optimal = gpuScalingResults.reduce((a, b) =>
      {return a.computeTime < b.computeTime ? a : b}
    );

    console.log('Optimal WebGPU configuration:', optimal);

    // Verify compute scaling efficiency
    for (const result of gpuScalingResults) {
      // Each configuration should be within 2x of optimal
      expect(result.computeTime / optimal.computeTime).toBeLessThan(2);
    }
  });
});