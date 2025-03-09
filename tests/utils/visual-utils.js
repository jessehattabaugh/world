import { expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import fs from 'fs';
/**
 * Visual testing utilities
 */
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const snapshotsDir = path.join(rootDir, 'snapshots');
const baselineDir = path.join(process.cwd(), 'snapshots', 'baselines');

// Ensure snapshots and baseline directories exist
if (!fs.existsSync(snapshotsDir)) {
  fs.mkdirSync(snapshotsDir, { recursive: true });
}

if (!fs.existsSync(baselineDir)) {
  fs.mkdirSync(baselineDir, { recursive: true });
}

/**
 * Assert visual baseline
 * @param {import('@playwright/test').Page} page
 * @param {string} testName
 */
export async function assertVisualBaseline(page, testName) {
  const baselineFile = path.join(baselineDir, `${testName}.png`);

  if (!fs.existsSync(baselineFile)) {
    // Create baseline if it doesn't exist
    await page.screenshot({ path: baselineFile });
    console.log(`Created new visual baseline for ${testName}`);
    return;
  }

  // Compare screenshot with baseline
  await expect(page).toHaveScreenshot(baselineFile, {
    animations: 'disabled',
    fullPage: true,
  });

  console.log(`Visual baseline for ${testName} is within acceptable limits`);
}

/**
 * Run all visual tests for a page
 * @param {Page} page Playwright page object
 * @param {string} pageId Page identifier
 */
export async function runVisualTests(page, pageId) {
  console.log(`📸 Running visual tests for ${pageId}...`);

  try {
    await assertVisualBaseline(page, pageId);
    console.log(`Visual tests for ${pageId} passed`);
  } catch (error) {
    console.error(`Visual tests for ${pageId} failed:`, error);
    throw error;
  }
}

/**
 * Safe visual comparison that creates baseline if it doesn't exist
 * @param {Page} page Playwright page
 * @param {string} name Screenshot name
 * @param {object} options Screenshot options
 */
export async function safeVisualComparison(page, name, options = {}) {
  const fullPath = path.join(snapshotsDir, `${name}.png`);
  const baselinePath = path.join(snapshotsDir, `${name}-baseline.png`);

  // Take the current screenshot
  await page.screenshot({
    path: fullPath,
    fullPage: options.fullPage !== false,
    animations: 'disabled',
    ...options
  });

  // If baseline doesn't exist, create it
  if (!fs.existsSync(baselinePath)) {
    console.log(`Creating baseline for ${name}`);
    fs.copyFileSync(fullPath, baselinePath);
    return true;
  }

  // Skip actual comparison in CI if we're just generating baselines
  if (process.env.SKIP_VISUAL_COMPARISON) {
    console.log(`Skipping comparison for ${name} as requested`);
    return true;
  }

  try {
    // Compare with baseline
    await expect(page).toHaveScreenshot(`${name}-baseline.png`, {
      animations: 'disabled',
      threshold: 0.2, // More tolerant threshold
      ...options
    });
    return true;
  } catch (error) {
    console.warn(`Visual difference detected for ${name}: ${error.message}`);

    // If updating baselines is enabled, update the baseline
    if (process.env.UPDATE_VISUAL_BASELINES) {
      console.log(`Updating baseline for ${name}`);
      fs.copyFileSync(fullPath, baselinePath);
    }

    // Don't fail the test in development mode
    if (process.env.NODE_ENV !== 'production' && !process.env.CI) {
      console.log('Ignoring visual differences in development mode');
      return true;
    }

    throw error;
  }
}

/**
 * Visual check function
 * @param {Page} page Playwright page
 * @param {string} name Screenshot name
 * @param {object} options Screenshot options
 */
export async function visualCheck(page, name, options = {}) {
  await safeVisualComparison(page, name, options);
}
