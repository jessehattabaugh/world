import { expect, test } from '../../utils/test-utils.js';

import { HomePage } from './home-page.js';
import { createPageTest } from '../../fixtures/page-fixtures.js';

// Run standard tests for this page
createPageTest(HomePage);

// Additional page-specific tests

// Helper function to handle tabbing and focus checks
async function tabAndCheckFocus(page, maxTabs = 10) {
  const focusableElements = [];

  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');

    const isFocused = await page.evaluate(() => {
      return document.activeElement !== document.body;
    });

    if (isFocused) {
      focusableElements.push(i);

      // Take screenshot with focused element
      await page.screenshot({
        path: `screenshots/keyboard-focus-${i}.png`,
        animations: 'disabled'
      });

      // Check if element can be activated
      const canBeActivated = await page.evaluate(() => {
        const el = document.activeElement;
        return el.tagName === 'A' ||
               el.tagName === 'BUTTON' ||
               el.getAttribute('role') === 'button';
      });

      if (canBeActivated && i === 2) { // Activate the third focusable element
        await page.keyboard.press('Enter');
        break;
      }
    }
  }

  return focusableElements;
}

test.describe('Homepage user interactions', () => {
  let homePage;

  test.beforeEach(async ({ page }) => {
    // Set up URL route handling for jessesworld.example.com domains
    await page.route(/https:\/\/jessesworld\.example\.com.*/, (route) => {
      const url = new URL(route.request().url());
      url.host = 'localhost:3000';
      url.protocol = 'http:';
      return route.continue({ url: url.toString() });
    });

    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('theme toggle changes appearance', async ({ visualCheck }) => {
    // Take screenshot before toggle
    await visualCheck('theme-before-toggle');

    // Toggle theme
    await homePage.toggleTheme();

    // Take screenshot after toggle
    await visualCheck('theme-after-toggle');

    // Verify theme changed in DOM
    await expect(homePage.page.locator('html')).toHaveClass(/dark-mode/);

    // Reload and verify theme persists
    await homePage.goto();
    await expect(homePage.page.locator('html')).toHaveClass(/dark-mode/);
  });

  test('music player controls work', async ({ page }) => {
    // Start with music paused
    await expect(homePage.musicToggle).not.toHaveClass(/playing/);

    // Toggle music
    await homePage.toggleMusic();

    // Verify music is playing
    await expect(homePage.musicToggle).toHaveClass(/playing/);

    // Verify audio element is playing
    const isPlaying = await page.evaluate(() => {
      const audioElements = Array.from(document.querySelectorAll('audio'));
      return audioElements.some((audio) => { return !audio.paused; });
    });
    expect(isPlaying).toBeTruthy('Audio should be playing');
  });

  test('hero section animates correctly', async ({ page }) => {
    // Check initial state of animations
    const animationState = await homePage.getHeroAnimationState();
    expect(animationState.opacity).toBe('1', 'Hero heading should be fully visible');

    // Test animation with reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await homePage.goto();

    // Animation should be disabled or immediate with reduced motion
    const reducedAnimationState = await homePage.getHeroAnimationState();
    expect(reducedAnimationState.opacity).toBe('1', 'Animation should respect reduced motion preference');
  });

  test('lazy loading optimizes performance', async () => {
    const images = await homePage.checkLazyLoadedImages();
    expect(images.length).toBeGreaterThan(0, 'Page should have lazy-loaded images');

    // Scroll to bottom to trigger lazy loading
    await homePage.page.evaluate(() => { return window.scrollTo(0, document.body.scrollHeight); });

    // Wait for lazy images to load
    await homePage.page.waitForTimeout(1000);

    // Check that images loaded after scrolling
    const loadedImages = await homePage.checkLazyLoadedImages();
    const allLoaded = loadedImages.every((img) => { return img.loaded; });
    expect(allLoaded).toBeTruthy('All images should load after scrolling into view');
  });
});

// Complete user journey tests

test.describe('User journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Set up URL route handling for jessesworld.example.com domains
    await page.route(/https:\/\/jessesworld\.example\.com.*/, (route) => {
      const url = new URL(route.request().url());
      url.host = 'localhost:3000';
      url.protocol = 'http:';
      return route.continue({ url: url.toString() });
    });
  });

  test('first-time visitor explores homepage and navigates to projects', async ({ page, axeCheck, visualCheck }) => {
    // Start journey as new visitor
    const homePage = new HomePage(page);
    await homePage.goto();

    // Check accessibility at start of journey
    await axeCheck();

    // Interact with homepage elements
    await expect(homePage.heroHeading).toBeVisible();
    await visualCheck('journey-start');

    // Toggle theme as part of exploration
    await homePage.toggleTheme();

    // Find and click link to projects page
    await page.getByRole('link', { name: /projects/i }).click();

    // Verify navigation to projects page
    await expect(page).toHaveURL(/.*projects/);
    await visualCheck('journey-projects-page');

    // Check accessibility after navigation
    await axeCheck();
  });

  test('user with assistive technology navigates with keyboard', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Press Tab repeatedly to navigate through all interactive elements
    const focusableElements = await tabAndCheckFocus(page);

    expect(focusableElements.length).toBeGreaterThan(1, 'Page should have multiple focusable elements');
  });
});
