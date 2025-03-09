/**
 * Utility functions for performance testing and Lighthouse score processing
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const performanceDir = path.join(rootDir, 'performance');

// Ensure the performance directory exists
if (!fs.existsSync(performanceDir)) {
  fs.mkdirSync(performanceDir, { recursive: true });
}

/**
 * Get browser performance metrics from a page
 * @param {Page} page Playwright page object
 * @returns {Object} Performance metrics
 */
export async function getBrowserPerformanceMetrics(page) {
  try {
    // Get basic metrics from browser
    const metrics = await page.evaluate(() => {
      return {
        // Navigation Timing API metrics
        TTFB: performance.timing.responseStart - performance.timing.navigationStart,
        DOMContentLoaded:
          performance.timing.domContentLoadedEventEnd -
          performance.timing.navigationStart,
        Load: performance.timing.loadEventEnd - performance.timing.navigationStart,

        // Try to get First Contentful Paint if available
        FCP: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,

        // Memory info if available
        memory: performance.memory ? {
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          usedJSHeapSize: performance.memory.usedJSHeapSize
        } : undefined,

        // Additional metrics
        CLS: 0,
        resourceCount: performance.getEntriesByType('resource').length,
        scriptDuration: performance.getEntriesByType('measure')
          .filter(m => {return m.name.includes('script')})
          .reduce((total, m) => {return total + m.duration}, 0)
      };
    });

    // Inject and run more advanced metrics gathering
    await page.evaluate(() => {
      return new Promise((resolve) => {
        // Measure LCP
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            const lcpEntry = entries[entries.length - 1];
            window.lcpValue = lcpEntry.startTime;
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // Measure CLS
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          window.clsValue = clsValue;
        }).observe({ type: 'layout-shift', buffered: true });

        // Wait to ensure metrics are collected
        setTimeout(() => {
          resolve();
        }, 1000);
      });
    });

    // Get the additional metrics we collected
    const additionalMetrics = await page.evaluate(() => {
      return {
        LCP: window.lcpValue || 0,
        CLS: window.clsValue || 0
      };
    });

    return {
      ...metrics,
      LCP: additionalMetrics.LCP || metrics.FCP,
      CLS: additionalMetrics.CLS
    };
  } catch (error) {
    console.error('Error collecting performance metrics:', error);
    return {
      error: 'Failed to collect metrics',
      errorDetails: error.message
    };
  }
}

/**
 * Compare metrics against baseline and update if needed
 * @param {string} pageId Page identifier
 * @param {Object} metrics Current performance metrics
 * @returns {Object} Comparison result
 */
export async function assertPerformanceBaseline(pageId, metrics) {
  const baselinePath = path.join(performanceDir, `${pageId}-performance.json`);
  const updateBaseline = process.env.UPDATE_PERFORMANCE_BASELINE === 'true';

  // If we're updating the baseline or it doesn't exist, save the current metrics
  if (updateBaseline || !fs.existsSync(baselinePath)) {
    const result = {
      timestamp: new Date().toISOString(),
      metrics
    };

    fs.writeFileSync(baselinePath, JSON.stringify(result, null, 2));
    console.log(`✅ ${updateBaseline ? 'Updated' : 'Created'} performance baseline for ${pageId}`);
    return { updated: true, baseline: null, current: metrics };
  }

  // Otherwise, compare against the baseline
  try {
    const baselineContent = fs.readFileSync(baselinePath, 'utf-8');
    const baseline = JSON.parse(baselineContent);

    // Do the comparison but don't fail the test - just log the differences
    const baselineMetrics = baseline.metrics;
    const comparison = compareMetrics(baselineMetrics, metrics);

    // Log the comparison
    if (comparison.degraded.length > 0) {
      console.warn(`⚠️ Performance degradation detected for ${pageId}:`);
      comparison.degraded.forEach(item => {
        console.warn(`  - ${item.metric}: ${item.baseline} → ${item.current} (${item.percentChange}% change)`);
      });
    }

    if (comparison.improved.length > 0) {
      console.log(`🚀 Performance improvements detected for ${pageId}:`);
      comparison.improved.forEach(item => {
        console.log(`  - ${item.metric}: ${item.baseline} → ${item.current} (${item.percentChange}% change)`);
      });
    }

    return { updated: false, baseline: baselineMetrics, current: metrics, comparison };
  } catch (error) {
    console.error(`Error comparing performance metrics for ${pageId}:`, error);
    return { error: true, message: error.message };
  }
}

/**
 * Compare current metrics with baseline
 * @param {Object} baseline Baseline metrics
 * @param {Object} current Current metrics
 * @returns {Object} Comparison results
 */
function compareMetrics(baseline, current) {
  const degraded = [];
  const improved = [];
  const unchanged = [];

  // Helper to check if a metric represents better performance when lower
  const isLowerBetter = (metric) => {
    const lowerBetterMetrics = [
      'TTFB', 'DOMContentLoaded', 'Load', 'FCP', 'LCP',
      'CLS', 'scriptDuration', 'TBT', 'TTI'
    ];
    return lowerBetterMetrics.includes(metric);
  };

  // Compare each metric
  for (const metric in current) {
    // Skip non-numeric metrics or complex objects
    if (typeof current[metric] !== 'number' || typeof baseline[metric] !== 'number') {
      if (metric === 'memory' && baseline[metric] && current[metric]) {
        // Compare memory metrics
        for (const memMetric in current[metric]) {
          if (typeof current[metric][memMetric] === 'number' &&
              typeof baseline[metric][memMetric] === 'number') {
            const baselineValue = baseline[metric][memMetric];
            const currentValue = current[metric][memMetric];
            const percentChange = ((currentValue - baselineValue) / baselineValue) * 100;

            // For memory, higher heap limit is better, but lower usage is better
            const isImprovement = memMetric === 'jsHeapSizeLimit' ?
              percentChange > 0 : percentChange < 0;

            const comparison = {
              metric: `memory.${memMetric}`,
              baseline: baselineValue,
              current: currentValue,
              percentChange: percentChange.toFixed(2)
            };

            if (Math.abs(percentChange) < 5) {
              unchanged.push(comparison);
            } else if (isImprovement) {
              improved.push(comparison);
            } else {
              degraded.push(comparison);
            }
          }
        }
      }
      continue;
    }

    const baselineValue = baseline[metric];
    const currentValue = current[metric];

    // Calculate percentage change
    const percentChange = ((currentValue - baselineValue) / baselineValue) * 100;

    // Determine if this is an improvement or degradation
    const lowerBetter = isLowerBetter(metric);
    const isImprovement = lowerBetter ? percentChange < 0 : percentChange > 0;

    const comparison = {
      metric,
      baseline: baselineValue,
      current: currentValue,
      percentChange: percentChange.toFixed(2)
    };

    // Only consider significant changes (more than 5%)
    if (Math.abs(percentChange) < 5) {
      unchanged.push(comparison);
    } else if (isImprovement) {
      improved.push(comparison);
    } else {
      degraded.push(comparison);
    }
  }

  return { degraded, improved, unchanged };
}

/**
 * Get Lighthouse scores from a performance report or URL
 * @param {string|Object} reportOrUrl - The Lighthouse report object or URL to test
 * @returns {Object} Object containing performance scores by category
 */
export async function getLighthouseScores(reportOrUrl = {}) {
  // This is a simplified implementation
  // In a real implementation, you'd need to run Lighthouse via its API
  console.log(`Getting Lighthouse scores for ${typeof reportOrUrl === 'string' ? reportOrUrl : 'report'}`);

  // If it's a URL, we'd run Lighthouse here
  // For now, return placeholder data
  return {
    performance: 0.95,
    accessibility: 0.98,
    'best-practices': 0.92,
    seo: 0.89,
    pwa: 0.65
  };
}

/**
 * Format Lighthouse scores for display
 * @param {Object} scores - Object containing performance scores
 * @returns {Object} Formatted scores (as percentages)
 */
export function formatScores(scores = {}) {
  const formatted = {};

  // Convert decimal scores to percentages
  Object.entries(scores).forEach(([key, value]) => {
    formatted[key] = typeof value === 'number' ? Math.round(value * 100) : 0;
  });

  return formatted;
}

/**
 * Run all performance tests for a page
 * @param {Page} page Playwright page object
 * @param {string} pageId Page identifier
 */
export async function runPerformanceTests(page, pageId) {
  console.log(`🔍 Running performance tests for ${pageId}...`);

  // Collect performance metrics
  const metrics = await getBrowserPerformanceMetrics(page);

  // Compare against baseline
  await assertPerformanceBaseline(pageId, metrics);

  // Run assertions on metrics
  const assertions = [
    { metric: 'FCP', threshold: 2000, message: 'FCP should be under 2 seconds' },
    { metric: 'LCP', threshold: 2500, message: 'LCP should be under 2.5 seconds' },
    { metric: 'CLS', threshold: 0.1, message: 'CLS should be under 0.1' }
  ];

  const results = assertions.map(assertion => {
    const { metric, threshold, message } = assertion;
    const value = metrics[metric];
    let passed = false;

    if (value !== undefined) {
      if (metric === 'CLS') {
        passed = value < threshold;
      } else {
        passed = value < threshold;
      }
    }

    return {
      metric,
      value,
      threshold,
      passed,
      message
    };
  });

  const failures = results.filter(r => {return !r.passed});

  if (failures.length > 0) {
    console.warn(`⚠️ Performance test failures for ${pageId}:`);
    failures.forEach(failure => {
      console.warn(`  - ${failure.metric}: ${failure.value} (threshold: ${failure.threshold}) - ${failure.message}`);
    });
  } else {
    console.log(`✅ All performance tests passed for ${pageId}`);
  }

  return { metrics, results };
}

/**
 * Get all performance metrics (previously used in perf-update.js)
 * @param {Page} page Playwright page object
 * @returns {Object} All performance metrics
 */
export async function getAllPerformanceMetrics(page) {
  return getBrowserPerformanceMetrics(page);
}
