/**
 * Performance baseline update utility
 *
 * This script updates performance baseline data for automated testing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';
import { getAllPerformanceMetrics } from '../tests/utils/performance-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const performanceDir = path.join(rootDir, 'performance');
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const urls = [
  { id: 'homepage', url: '/' },
  { id: 'about', url: '/about' }
];

/**
 * Ensure the performance directory exists
 */
if (!fs.existsSync(performanceDir)) {
  fs.mkdirSync(performanceDir, { recursive: true });
}

/**
 * Measure performance metrics for a given page
 * @param {Browser} browser Playwright browser instance
 * @param {string} pageId Page identifier
 * @param {string} pageUrl Page URL to test
 */
async function measurePagePerformance(browser, pageId, pageUrl) {
  const fullUrl = new URL(pageUrl, baseUrl).toString();
  console.log(`📊 Measuring performance for ${pageId} at ${fullUrl}`);

  const context = await browser.newContext();
  const page = await context.newPage();

  // Set viewport to desktop size
  await page.setViewportSize({ width: 1280, height: 720 });

  // Navigate to the page and wait for network idle
  await page.goto(fullUrl, { waitUntil: 'networkidle' });

  // Collect performance metrics
  const metrics = await getAllPerformanceMetrics(page);

  // Add timestamp to metrics
  const result = {
    timestamp: new Date().toISOString(),
    metrics
  };

  // Save metrics to file
  const outputPath = path.join(performanceDir, `${pageId}-performance.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

  console.log(`✅ Performance baseline updated for ${pageId}`);
  console.log(`   File saved to: ${outputPath}`);

  await page.close();
  await context.close();
}

/**
 * Update all performance baselines
 */
async function updatePerformanceBaselines() {
  console.log('🚀 Starting performance baseline update...');

  const browser = await chromium.launch();

  try {
    for (const { id, url } of urls) {
      await measurePagePerformance(browser, id, url);
    }

    // Also create a lighthouse performance baseline
    const lighthousePerf = {
      timestamp: new Date().toISOString(),
      metrics: null // Will be populated by the lighthouse tool
    };
    fs.writeFileSync(
      path.join(performanceDir, 'homepage-lighthouse-performance.json'),
      JSON.stringify(lighthousePerf, null, 2)
    );

    console.log('📝 Remember to run `npm run analyze` to populate lighthouse metrics');

  } catch (error) {
    console.error('❌ Error updating performance baselines:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }

  console.log('✨ Performance baseline update complete');
}

updatePerformanceBaselines();
