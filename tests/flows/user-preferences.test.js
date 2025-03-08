/**
 * User preferences flow tests
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createPageFixture, getBaseUrl } from '../setup.js';
import { findToggleElement, clearPreferences } from '../utils/test-helpers.js';

describe('User Preferences Flow', () => {
  const getPage = createPageFixture();

  it('should remember user theme preference across page navigation', async () => {
    const page = getPage();
    await clearPreferences(page);
    await page.goto(getBaseUrl());

    // Test theme toggle functionality
    const themeToggle = await findToggleElement(page);
    assert.ok(themeToggle, 'Theme toggle should be found');

    // Get initial theme state
    const initialIsDarkMode = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark-mode');
    });

    // Change theme
    await themeToggle.click();

    // Verify theme changed
    const newIsDarkMode = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark-mode');
    });
    assert.notEqual(newIsDarkMode, initialIsDarkMode, 'Theme should change when toggle is clicked');

    // Navigate to another page
    await page.getByRole('link', { name: /about/i }).click();

    // Check that theme persisted across navigation
    const persistedIsDarkMode = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark-mode');
    });
    assert.equal(persistedIsDarkMode, newIsDarkMode, 'Theme preference should persist across navigation');
  });

  it('should respect reduced motion preference', async () => {
    const page = getPage();

    // Emulate a user who prefers reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(getBaseUrl());

    // Check if the page respects reduced motion preference
    const hasReducedMotionClass = await page.evaluate(() => {
      return document.documentElement.classList.contains('reduced-motion') ||
             getComputedStyle(document.documentElement).getPropertyValue('--reduced-motion') === 'true';
    });

    assert.ok(hasReducedMotionClass, 'Page should respect reduced motion preference');

    // Trigger a navigation that would normally animate
    await page.getByRole('link', { name: /about/i }).click();

    // Verify we reached the destination
    const url = page.url();
    assert.ok(url.includes('about'), `URL should include 'about' (was ${url})`);
  });
});
