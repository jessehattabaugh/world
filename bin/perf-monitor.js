import { performance, PerformanceObserver } from 'perf_hooks';
import { writeFileSync } from 'fs';

// Metrics we want to track
const metrics = {
  fps: [],
  frameTime: [],
  entityCount: [],
  gpuMemory: [],
  jsHeapSize: [],
  workerCount: [],
  timestamp: []
};

let startTime = performance.now();

// Set up performance observer
const obs = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  for (const entry of entries) {
    // Record relevant metrics
    switch (entry.name) {
      case 'frame':
        metrics.frameTime.push(entry.duration);
        metrics.fps.push(1000 / entry.duration);
        break;
      case 'simulation-update':
        metrics.entityCount.push(entry.detail?.entityCount || 0);
        metrics.workerCount.push(entry.detail?.workerCount || 0);
        break;
    }

    // Record timestamp
    metrics.timestamp.push(performance.now() - startTime);

    // Sample memory usage
    if (globalThis.performance?.memory) {
      metrics.jsHeapSize.push(performance.memory.usedJSHeapSize);
    }
  }
});

obs.observe({ entryTypes: ['measure', 'mark'] });

// Sample GPU memory if available
async function sampleGPUMemory() {
  if (!navigator?.gpu) return 0;

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return 0;

  const info = await adapter.requestAdapterInfo();
  return info.maxMemoryUsage || 0;
}

// Export metrics to JSON file
function exportMetrics() {
  const data = {
    metrics,
    summary: {
      avgFps: average(metrics.fps),
      avgFrameTime: average(metrics.frameTime),
      maxEntityCount: Math.max(...metrics.entityCount),
      peakMemoryMB: Math.max(...metrics.jsHeapSize) / 1024 / 1024,
      totalDuration: metrics.timestamp[metrics.timestamp.length - 1]
    }
  };

  writeFileSync('performance-report.json', JSON.stringify(data, null, 2));
}

// Utility function for averages
function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Start monitoring and export results on exit
process.on('SIGINT', () => {
  exportMetrics();
  process.exit();
});

console.log('Performance monitoring started. Press Ctrl+C to stop and generate report.');

// Sample GPU memory periodically
setInterval(async () => {
  const gpuMem = await sampleGPUMemory();
  metrics.gpuMemory.push(gpuMem);
}, 1000);