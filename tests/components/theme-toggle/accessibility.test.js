/**
 * Theme toggle accessibility tests
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createPageFixture, getBaseUrl, expectScreenshot } from '../../setup.js';
import { wait } from '../../utils/test-helpers.js';

describe('Theme Toggle - Accessibility', () => {
  const getPage = createPageFixture();

  it('should be keyboard accessible', async () => {
    const page = getPage();
    await page.goto(getBaseUrl());

    // Tab to the toggle
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check if toggle is focused
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return (
        el?.getAttribute('role') === 'switch' &&
        el?.getAttribute('aria-label')?.toLowerCase().includes('toggle theme')
      );
    });

    assert.ok(focused, 'Theme toggle should be focusable with keyboard');

    // Take screenshot with focus
    const hasFocusScreenshot = await expectScreenshot(page, 'theme-toggle-focused');
    assert.ok(hasFocusScreenshot, 'Should have focus screenshot');

    // Activate with Enter key
    await page.keyboard.press('Enter');
    await wait(200);

    // Take screenshot after keyboard activation
    const hasActivatedScreenshot = await expectScreenshot(page, 'theme-toggle-keyboard-activated');
    assert.ok(hasActivatedScreenshot, 'Should have activated screenshot');
  });
});
