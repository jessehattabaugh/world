/**
 * Performance testing utilities
 *
 * Provides functions for measuring and comparing performance metrics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const performanceDir = path.join(rootDir, 'performance');

/**
 * Get performance metrics from the browser
 * @param {Page} page Playwright page object
 * @returns {Object} Performance metrics
 */
export async function getBrowserPerformanceMetrics(page) {
  return page.evaluate(() => {
    const perfEntries = performance.getEntriesByType('navigation')[0];
    const paintEntries = performance.getEntriesByType('paint');

    const getFCP = () => {
      const fcpEntry = paintEntries.find(entry => {return entry.name === 'first-contentful-paint'});
      return fcpEntry ? fcpEntry.startTime : null;
    };

    return {
      // Navigation Timing API metrics
      TTFB: perfEntries.responseStart - perfEntries.requestStart,
      DOMContentLoaded: perfEntries.domContentLoadedEventEnd - perfEntries.fetchStart,
      Load: perfEntries.loadEventEnd - perfEntries.fetchStart,

      // Paint Timing API metrics
      FCP: getFCP(),

      // Additional metrics if available
      memory: performance.memory ? {
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        usedJSHeapSize: performance.memory.usedJSHeapSize
      } : null,

      // Custom metrics
      resourceCount: performance.getEntriesByType('resource').length,
      scriptDuration: perfEntries.domComplete - perfEntries.domContentLoadedEventEnd
    };
  });
}

/**
 * Get all available performance metrics
 * Includes both browser metrics and any custom measurements
 * @param {Page} page Playwright/Puppeteer page object
 */
export async function getAllPerformanceMetrics(page) {
  const browserMetrics = await getBrowserPerformanceMetrics(page);

  // Use the Core Web Vitals API if available
  let webVitals = {};
  try {
    webVitals = await page.evaluate(() => {
      return new Promise(resolve => {
        // Only proceed if the web vitals API is available
        if (typeof window.webVitals === 'undefined') {
          return resolve({});
        }

        const vitals = {};
        const reportWebVital = ({ name, value }) => {
          vitals[name] = value;
          if (Object.keys(vitals).length >= 3) { // LCP, CLS, FID
            resolve(vitals);
          }
        };

        window.webVitals.getCLS(reportWebVital);
        window.webVitals.getLCP(reportWebVital);
        window.webVitals.getFID(reportWebVital);
      });
    });
  } catch (e) {
    // Web vitals may not be available in all environments
  }

  return {
    ...browserMetrics,
    ...webVitals
  };
}

/**
 * Assert that current performance is within baseline thresholds
 * @param {string} baselineId Identifier for the baseline (e.g., 'homepage')
 * @param {Object} currentMetrics Current performance metrics
 * @param {Object} options Comparison options including thresholds
 */
export async function assertPerformanceBaseline(baselineId, currentMetrics, options = {}) {
  const baselinePath = path.join(performanceDir, `${baselineId}-performance.json`);

  // If baseline doesn't exist, create it
  if (!fs.existsSync(baselinePath)) {
    console.log(`⚠️ No baseline found for ${baselineId}, creating new baseline`);
    const newBaseline = {
      timestamp: new Date().toISOString(),
      metrics: currentMetrics
    };
    fs.writeFileSync(baselinePath, JSON.stringify(newBaseline, null, 2));
    return true;
  }

  // Load existing baseline
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

  // Default thresholds (percentage increase allowed)
  const thresholds = {
    TTFB: 20,
    DOMContentLoaded: 20,
    Load: 20,
    FCP: 20,
    LCP: 20,
    CLS: 0.1,
    resourceCount: 5,
    scriptDuration: 25,
    ...options.thresholds
  };

  // Compare current metrics to baseline
  const results = {};
  let passed = true;

  // Skip comparisons if baseline metrics is null
  if (!baseline.metrics) {
    console.warn(`⚠️ No metrics in baseline for ${baselineId}`);
    return true;
  }

  // For each metric in the baseline, check if current is within threshold
  Object.keys(baseline.metrics).forEach(metricName => {
    // Skip if current metric is missing
    if (currentMetrics[metricName] === undefined) {
      return;
    }

    const baselineValue = baseline.metrics[metricName];
    const currentValue = currentMetrics[metricName];

    // Skip null values
    if (baselineValue === null || currentValue === null) {
      return;
    }

    // For object values (e.g., memory), skip comparison
    if (typeof baselineValue === 'object') {
      return;
    }

    // Calculate percentage increase
    const percentageIncrease = ((currentValue - baselineValue) / baselineValue) * 100;
    const threshold = thresholds[metricName] || 20; // Default 20% threshold

    results[metricName] = {
      baseline: baselineValue,
      current: currentValue,
      percentageIncrease,
      passed: percentageIncrease <= threshold
    };

    if (!results[metricName].passed) {
      passed = false;
    }
  });

  // Log comparison results
  console.log(`\n📊 Performance comparison for ${baselineId}:`);
  Object.keys(results).forEach(metric => {
    const { baseline, current, percentageIncrease, passed } = results[metric];
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${metric}: ${baseline.toFixed(2)} → ${current.toFixed(2)} (${percentageIncrease.toFixed(2)}%)`);
  });

  return passed;
}

/**
 * Utility functions for performance testing and Lighthouse score processing
 */

/**
 * Get Lighthouse scores from a performance report
 * @param {Object} report - The Lighthouse report object
 * @returns {Object} Object containing performance scores by category
 */
export function getLighthouseScores(report = {}) {
  // Default implementation - replace with actual implementation as needed
  const categories = report.categories || {};

  return {
    performance: categories.performance?.score || 0,
    accessibility: categories.accessibility?.score || 0,
    bestPractices: categories['best-practices']?.score || 0,
    seo: categories.seo?.score || 0,
    pwa: categories.pwa?.score || 0,
    // Add any additional metrics you need from the report
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
