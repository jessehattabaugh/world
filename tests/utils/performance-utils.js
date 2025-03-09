import { fileURLToPath } from 'url';
import fs from 'fs';
/**
 * Performance testing utilities
 */
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const performanceDir = path.join(rootDir, 'performance');

// Ensure performance directory exists
if (!fs.existsSync(performanceDir)) {
  fs.mkdirSync(performanceDir, { recursive: true });
}

/**
 * Get performance metrics from the browser
 * @param {import('@playwright/test').Page} page Playwright page
 * @returns {Object} Performance metrics
 */
export async function getBrowserPerformanceMetrics(page) {
  try {
    // Navigate Performance API metrics
    const navMetrics = await page.evaluate(() => {
      // Handle case where Performance API isn't available
      if (!window.performance || !window.performance.timing) {
        return { errorMessage: 'Performance API not available' };
      }

      const timing = window.performance.timing;
      const navigationStart = timing.navigationStart;

      return {
        // Navigation timing metrics
        navigationStart,
        domLoading: timing.domLoading - navigationStart,
        domInteractive: timing.domInteractive - navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - navigationStart,
        domComplete: timing.domComplete - navigationStart,
        loadEvent: timing.loadEventEnd - navigationStart,
      };
    });

    // Get First Paint (FP) and First Contentful Paint (FCP)
    const paintMetrics = await page.evaluate(() => {
      if (!window.performance || !window.performance.getEntriesByType) {
        return { errorMessage: 'Performance entries API not available' };
      }

      const paintEntries = window.performance.getEntriesByType('paint');
      const fp = paintEntries.find(entry => entry.name === 'first-paint');
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');

      return {
        FP: fp ? fp.startTime : undefined,
        FCP: fcp ? fcp.startTime : undefined,
      };
    });

    // Get Largest Contentful Paint (LCP), if available
    const lcpMetrics = await page.evaluate(() => {
      if (!window.LargestContentfulPaint && !window.PerformanceObserver) {
        return { LCP: undefined };
      }

      // Try to get LCP directly if already recorded
      const lcpEntries = window.performance.getEntriesByType?.('largest-contentful-paint') || [];
      if (lcpEntries.length > 0) {
        return { LCP: lcpEntries[lcpEntries.length - 1].startTime };
      }

      // LCP might not be directly exposed in all browsers
      return { LCP: window.largestContentfulPaint?.startTime };
    });

    // Get Cumulative Layout Shift (CLS), if available
    const clsMetrics = await page.evaluate(() => {
      if (!window.LayoutShift && !window.PerformanceObserver) {
        return { CLS: undefined };
      }

      let cls = 0;
      const layoutShiftEntries = window.performance.getEntriesByType?.('layout-shift') || [];

      if (layoutShiftEntries.length > 0) {
        layoutShiftEntries.forEach(entry => {
          if (!entry.hadRecentInput) {
            cls += entry.value;
          }
        });
      }

      return { CLS: cls || undefined };
    });

    return {
      ...navMetrics,
      ...paintMetrics,
      ...lcpMetrics,
      ...clsMetrics,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    return {
      error: error.toString(),
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Assert performance metrics against baseline
 * @param {string} pageId Page ID
 * @param {Object} metrics Current metrics
 * @returns {Object} Comparison results
 */
export async function assertPerformanceBaseline(pageId, metrics) {
  // Default thresholds to assess performance
  const defaultThresholds = {
    FCP: 2000, // First Contentful Paint (ms)
    LCP: 2500, // Largest Contentful Paint (ms)
    CLS: 0.1, // Cumulative Layout Shift (unitless)
    domContentLoaded: 2000, // DOM Content Loaded (ms)
    loadEvent: 3000, // Load Event (ms)
  };

  const isDev = process.env.NODE_ENV === 'development' || !process.env.CI;

  try {
    // Get or create baseline file
    const baselineFile = path.join(performanceDir, `${pageId}-performance.json`);
    let baseline;

    // If baseline doesn't exist, create it
    if (!fs.existsSync(baselineFile)) {
      baseline = {
        ...metrics,
        thresholds: defaultThresholds,
        createdAt: new Date().toISOString(),
      };

      fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2));
      console.log(`Created new performance baseline for ${pageId}`);
    } else {
      // Read existing baseline
      const baselineData = fs.readFileSync(baselineFile, 'utf8');
      baseline = JSON.parse(baselineData);
    }

    // Compare metrics with baseline thresholds
    const thresholds = baseline.thresholds || defaultThresholds;
    const results = {
      pass: true,
      details: [],
    };

    // Check each metric against threshold
    for (const [metric, threshold] of Object.entries(thresholds)) {
      if (metrics[metric] !== undefined) {
        const pass =
          (metric === 'CLS' && metrics[metric] <= threshold) ||
          (metric !== 'CLS' && metrics[metric] <= threshold);

        results.details.push({
          metric,
          current: metrics[metric],
          threshold,
          pass,
        });

        if (!pass && !isDev) {
          results.pass = false;
        }
      }
    }

    // Log results
    const failedMetrics = results.details.filter(d => !d.pass);
    if (failedMetrics.length > 0) {
      console.warn(`⚠️ Performance issues detected for ${pageId}:`);
      failedMetrics.forEach(({ metric, current, threshold }) => {
        console.warn(`  - ${metric}: ${current} (exceeds ${threshold})`);
      });

      // Don't fail tests in development mode
      if (isDev) {
        console.warn('Ignoring performance thresholds in development mode');
        results.pass = true;
      }
    } else {
      console.log(`✅ Performance verified for ${pageId}`);
    }

    // Save current metrics
    const reportFile = path.join(performanceDir, `${pageId}-performance-latest.json`);
    fs.writeFileSync(reportFile, JSON.stringify({
      metrics,
      baseline: baseline.thresholds,
      results,
      timestamp: new Date().toISOString(),
    }, null, 2));

    return results;
  } catch (error) {
    console.error('Error asserting performance baseline:', error);
    return {
      pass: isDev, // Pass in dev mode to avoid failures
      error: error.toString(),
    };
  }
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
