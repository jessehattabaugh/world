/**
 * Theme toggle functionality tests
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createPageFixture, getBaseUrl } from '../../setup.js';
import { clearPreferences, findToggleElement, wait } from '../../utils/test-helpers.js';

describe('Theme Toggle - Functionality', () => {
  const getPage = createPageFixture();

  beforeEach(async () => {
    const page = getPage();
    await clearPreferences(page);
  });

  it('should toggle the theme when clicked', async () => {
    const page = getPage();
    await page.goto(getBaseUrl());

    // Find the theme toggle
    const themeToggle = await findToggleElement(page);
    assert.ok(themeToggle, 'Theme toggle should be found on the page');

    // Get initial theme state
    const initialIsDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark-mode');
    });

    // Click toggle and check if theme changed
    await themeToggle.click();
    await wait(300);

    const newIsDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark-mode');
    });

    assert.notEqual(newIsDark, initialIsDark, 'Theme should change after clicking the toggle');
  });

  it('should remember preference after reload', async () => {
    const page = getPage();
    await page.goto(getBaseUrl());

    // Find the theme toggle
    const themeToggle = await findToggleElement(page);
    assert.ok(themeToggle, 'Theme toggle should be found on the page');

    // Get initial theme state
    const initialIsDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark-mode');
    });

    // Click toggle and check if theme changed
    await themeToggle.click();
    await wait(300);

    // Reload the page
    await page.reload();
    await wait(300);

    // Check if theme preference was remembered
    const rememberedIsDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark-mode');
    });

    assert.notEqual(rememberedIsDark, initialIsDark, 'Theme preference should be remembered after reload');
  });

  it('should reflect system preference when in system mode', async () => {
    const page = getPage();

    // Set to system mode
    await page.goto(getBaseUrl());
    await page.evaluate(() => {
      try {
        localStorage.setItem('theme-preference', 'system');
        return true;
      } catch (e) {
        console.error('Error setting system preference:', e);
        return false;
      }
    });

    // Test with dark system preference
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    const isDarkWithSystemDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark-mode');
    });
    assert.ok(isDarkWithSystemDark, 'Should use dark mode when system preference is dark');

    // Test with light system preference
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    const isDarkWithSystemLight = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark-mode');
    });
    assert.ok(!isDarkWithSystemLight, 'Should use light mode when system preference is light');
  });
});
