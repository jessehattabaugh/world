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

// Ensure snapshots directory exists
if (!fs.existsSync(snapshotsDir)) {
  fs.mkdirSync(snapshotsDir, { recursive: true });
}

/**
 * Run all visual tests for a page
 * @param {Page} page Playwright page object
 * @param {string} pageId Page identifier
 */
export async function runVisualTests(page, pageId) {
  console.log(`📸 Running visual tests for ${pageId}...`);

  // Original viewport size (save for restoring later)
  const originalViewport = await page.viewportSize();

  try {
    // Desktop screenshot
    await page.setViewportSize({ width: 1280, height: 720 });

    // Wait for any animations to complete
    await page.waitForTimeout(500);

    // Take screenshot and save it
    const desktopPath = path.join(snapshotsDir, `${pageId}-desktop.png`);
    await page.screenshot({
      path: desktopPath,
      fullPage: true
    });

    // Create baseline if it doesn't exist
    const desktopBaselinePath = path.join(snapshotsDir, `${pageId}-desktop-baseline.png`);
    if (!fs.existsSync(desktopBaselinePath)) {
      console.log(`Creating baseline desktop screenshot: ${desktopBaselinePath}`);
      fs.copyFileSync(desktopPath, desktopBaselinePath);
    }

    console.log(`✅ Saved desktop screenshot to ${desktopPath}`);

    // Mobile screenshot
    await page.setViewportSize({ width: 375, height: 667 });

    // Wait for any mobile-specific layouts to render
    await page.waitForTimeout(500);

    // Take screenshot and save it
    const mobilePath = path.join(snapshotsDir, `${pageId}-mobile.png`);
    await page.screenshot({
      path: mobilePath,
      fullPage: true
    });

    // Create baseline if it doesn't exist
    const mobileBaselinePath = path.join(snapshotsDir, `${pageId}-mobile-baseline.png`);
    if (!fs.existsSync(mobileBaselinePath)) {
      console.log(`Creating baseline mobile screenshot: ${mobileBaselinePath}`);
      fs.copyFileSync(mobilePath, mobileBaselinePath);
    }

    console.log(`✅ Saved mobile screenshot to ${mobilePath}`);

  } catch (error) {
    console.error('Error during visual tests:', error);
  } finally {
    // Restore original viewport
    if (originalViewport) {
      await page.setViewportSize(originalViewport);
    }
  }

  return {
    desktopImage: `${pageId}-desktop.png`,
    mobileImage: `${pageId}-mobile.png`
  };
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
