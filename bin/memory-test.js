import { test } from '@playwright/test';
import { writeFileSync } from 'fs';
import v8 from 'v8';

const MEMORY_TEST_SCENARIOS = [
  {
    name: 'entity-scaling',
    steps: [
      { action: 'spawn', count: 100, duration: 5000 },
      { action: 'spawn', count: 500, duration: 5000 },
      { action: 'spawn', count: 1000, duration: 5000 },
      { action: 'reset', duration: 5000 }
    ]
  },
  {
    name: 'worker-scaling',
    steps: [
      { action: 'setWorkers', count: 1, duration: 5000 },
      { action: 'setWorkers', count: 2, duration: 5000 },
      { action: 'setWorkers', count: 4, duration: 5000 },
      { action: 'setWorkers', count: 1, duration: 5000 }
    ]
  },
  {
    name: 'gpu-buffer-scaling',
    steps: [
      { action: 'setBufferSize', size: '1MB', duration: 5000 },
      { action: 'setBufferSize', size: '10MB', duration: 5000 },
      { action: 'setBufferSize', size: '100MB', duration: 5000 },
      { action: 'setBufferSize', size: '1MB', duration: 5000 }
    ]
  }
];

const results = {
  scenarios: [],
  leaks: [],
  summary: {
    maxHeapUsed: 0,
    maxEntityCount: 0,
    maxWorkerCount: 0,
    maxGPUMemory: 0
  }
};

// Memory snapshot utilities
function takeMemorySnapshot() {
  const snapshot = {
    heap: process.memoryUsage(),
    v8Stats: v8.getHeapStatistics(),
    timestamp: Date.now()
  };
  return snapshot;
}

function compareSnapshots(before, after) {
  return {
    heapDiff: after.heap.heapUsed - before.heap.heapUsed,
    externalDiff: after.heap.external - before.heap.external,
    totalDiff: (after.heap.heapTotal - before.heap.heapTotal),
    v8HeapDiff: (after.v8Stats.used_heap_size - before.v8Stats.used_heap_size)
  };
}

async function runScenario(page, scenario) {
  console.log(`Running memory scenario: ${scenario.name}`);

  const scenarioResult = {
    name: scenario.name,
    steps: [],
    finalMemoryDelta: 0,
    potentialLeak: false
  };

  const initialSnapshot = takeMemorySnapshot();

  for (const step of scenario.steps) {
    const stepStart = takeMemorySnapshot();

    // Execute step action
    await page.evaluate((step) => {
      const sim = window.jessesWorld.simulator;
      switch (step.action) {
        case 'spawn':
          for (let i = 0; i < step.count; i++) {
            sim.spawnLifeform();
          }
          break;
        case 'setWorkers':
          sim.setWorkerCount(step.count);
          break;
        case 'setBufferSize':
          sim.resizeBuffers(step.size);
          break;
        case 'reset':
          sim.resetSimulation();
          break;
      }
    }, step);

    // Wait for specified duration
    await page.waitForTimeout(step.duration);

    const stepEnd = takeMemorySnapshot();
    const stepDiff = compareSnapshots(stepStart, stepEnd);

    scenarioResult.steps.push({
      action: step.action,
      memoryDelta: stepDiff.heapDiff,
      v8Delta: stepDiff.v8HeapDiff
    });

    // Update max values
    results.summary.maxHeapUsed = Math.max(
      results.summary.maxHeapUsed,
      stepEnd.heap.heapUsed
    );
  }

  const finalSnapshot = takeMemorySnapshot();
  const totalDiff = compareSnapshots(initialSnapshot, finalSnapshot);

  scenarioResult.finalMemoryDelta = totalDiff.heapDiff;

  // Check for potential memory leaks
  // We consider it a leak if we retain more than 10% of peak memory
  const peakMemory = Math.max(...scenarioResult.steps.map(s => s.memoryDelta));
  scenarioResult.potentialLeak = totalDiff.heapDiff > (peakMemory * 0.1);

  if (scenarioResult.potentialLeak) {
    results.leaks.push({
      scenario: scenario.name,
      retainedMemory: totalDiff.heapDiff,
      details: `Retained ${(totalDiff.heapDiff / 1024 / 1024).toFixed(2)}MB after scenario`
    });
  }

  results.scenarios.push(scenarioResult);
}

test('Run memory tests', async ({ page }) => {
  await page.goto('http://localhost:3000');

  for (const scenario of MEMORY_TEST_SCENARIOS) {
    await runScenario(page, scenario);

    // Force garbage collection between scenarios
    if (global.gc) {
      global.gc();
    }
  }

  // Get final GPU memory stats if available
  const gpuStats = await page.evaluate(() => {
    return window.jessesWorld?.simulator?.gpuManager?.getMemoryInfo() || null;
  });

  if (gpuStats) {
    results.summary.maxGPUMemory = gpuStats.peakMemoryUsage;
  }

  writeFileSync('memory-test-results.json', JSON.stringify(results, null, 2));

  console.log('\nMemory test summary:');
  console.log(`Max heap used: ${(results.summary.maxHeapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Potential memory leaks found: ${results.leaks.length}`);
  results.leaks.forEach(leak => {
    console.log(`- ${leak.scenario}: ${leak.details}`);
  });
});