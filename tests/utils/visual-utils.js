/**
 * Visual testing utilities
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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
    console.log(`✅ Saved mobile screenshot to ${mobilePath}`);

    // If you had visual diffing capabilities, you would do that here
    // by comparing with baseline images

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
