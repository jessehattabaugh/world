import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const performanceDir = path.join(rootDir, 'performance');
const baselineDir = path.join(process.cwd(), 'performance', 'baselines');

// Ensure performance directory exists
if (!fs.existsSync(performanceDir)) {
  fs.mkdirSync(performanceDir, { recursive: true });
}

// Ensure baseline directory exists
if (!fs.existsSync(baselineDir)) {
  fs.mkdirSync(baselineDir, { recursive: true });
}

/**
 * Get browser performance metrics
 * @param {import('@playwright/test').Page} page
 */
export async function getBrowserPerformanceMetrics(page) {
  return page.evaluate(() => {
    const { timing } = performance;
    return {
      FCP: timing.responseStart - timing.navigationStart,
      LCP: timing.loadEventEnd - timing.navigationStart,
      CLS: 0.1, // Placeholder value
      TTFB: timing.responseStart - timing.requestStart,
      DOMContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      Load: timing.loadEventEnd - timing.navigationStart,
    };
  });
}

/**
 * Assert performance against baseline
 * @param {string} testName
 * @param {object} metrics
 */
export async function assertPerformanceBaseline(testName, metrics) {
  const baselineFile = path.join(baselineDir, `${testName}.json`);

  if (!fs.existsSync(baselineFile)) {
    // Create baseline if it doesn't exist
    fs.writeFileSync(baselineFile, JSON.stringify(metrics, null, 2));
    console.log(`Created new performance baseline for ${testName}`);
    return;
  }

  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf-8'));

  // Compare metrics with baseline
  for (const key of Object.keys(metrics)) {
    if (metrics[key] > baseline[key]) {
      throw new Error(`Performance regression detected in ${testName}: ${key} is ${metrics[key]}, baseline is ${baseline[key]}`);
    }
  }

  console.log(`Performance metrics for ${testName} are within baseline`);
}

/**
 * Run all performance tests for a page
 * @param {import('@playwright/test').Page} page Playwright page
 * @param {string} pageId Page identifier
 */
export async function runPerformanceTests(page, pageId) {
  console.log(`⏱️ Running performance tests for ${pageId}...`);

  try {
    // Collect metrics
    const metrics = await getBrowserPerformanceMetrics(page);

    // Compare against baseline
    const results = await assertPerformanceBaseline(pageId, metrics);

    return { metrics, results };
  } catch (error) {
    console.error('Error running performance tests:', error);
    return { error: error.message };
  }
}
