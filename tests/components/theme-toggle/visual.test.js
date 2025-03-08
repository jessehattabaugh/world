/**
 * Theme toggle visual tests
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createPageFixture, getBaseUrl, expectScreenshot } from '../../setup.js';
import { clearPreferences, findToggleElement, wait } from '../../utils/test-helpers.js';

describe('Theme Toggle - Visual', () => {
  const getPage = createPageFixture();

  beforeEach(async () => {
    const page = getPage();
    await clearPreferences(page);
  });

  it('should visually change when toggled', async () => {
    const page = getPage();
    await page.goto(getBaseUrl());

    // Find the theme toggle
    const themeToggle = await findToggleElement(page);
    assert.ok(themeToggle, 'Theme toggle should be found on the page');

    // Take screenshot before clicking
    const beforeToggleScreenshot = await expectScreenshot(page, 'theme-toggle-before-click');
    assert.ok(beforeToggleScreenshot, 'Should have before toggle screenshot');

    // Click toggle and wait for animation
    await themeToggle.click();
    await wait(300);

    // Take screenshot after clicking
    const afterToggleScreenshot = await expectScreenshot(page, 'theme-toggle-after-click');
    assert.ok(afterToggleScreenshot, 'Should have after toggle screenshot');
  });

  it('should show correct visual state for remembered preference', async () => {
    const page = getPage();
    await page.goto(getBaseUrl());

    // Find the theme toggle
    const themeToggle = await findToggleElement(page);

    // Click toggle and wait for animation
    await themeToggle.click();
    await wait(300);

    // Reload the page
    await page.reload();
    await wait(300);

    // Take screenshot of remembered state
    const rememberedScreenshot = await expectScreenshot(page, 'theme-toggle-remembered');
    assert.ok(rememberedScreenshot, 'Should have remembered state screenshot');
  });

  it('should show correct visual state for system preference', async () => {
    const page = getPage();

    // Set to system mode
    await page.goto(getBaseUrl());
    await page.evaluate(() => {
      localStorage.setItem('theme-preference', 'system');
    });

    // Test with dark system preference
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();

    const darkSystemScreenshot = await expectScreenshot(page, 'theme-toggle-system-dark');
    assert.ok(darkSystemScreenshot, 'Should have system dark screenshot');

    // Test with light system preference
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();

    const lightSystemScreenshot = await expectScreenshot(page, 'theme-toggle-system-light');
    assert.ok(lightSystemScreenshot, 'Should have system light screenshot');
  });
});
