/**
 * Homepage visual regression tests
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createPageFixture, getBaseUrl, expectScreenshot } from '../../setup.js';
import { wait } from '../../utils/test-helpers.js';

describe('Homepage - Visual', () => {
  const getPage = createPageFixture();

  it('should match desktop visual baseline', async () => {
    const page = getPage();
    await page.goto(getBaseUrl());

    // Wait for any animations or transitions to complete
    await wait(500);

    // Take a screenshot of the entire page
    const desktopScreenshot = await expectScreenshot(page, 'homepage-desktop');
    assert.ok(desktopScreenshot, 'Should have homepage desktop screenshot');
  });

  it('should match mobile visual baseline', async () => {
    const page = getPage();

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(getBaseUrl());

    // Wait for key elements to be visible
    await page
      .getByRole('heading', { level: 1 })
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {
        console.log('Heading level 1 not found, continuing test');
      });

    // Wait for any animations to complete
    await wait(500);

    const mobileScreenshot = await expectScreenshot(page, 'homepage-mobile');
    assert.ok(mobileScreenshot, 'Should have homepage mobile screenshot');
  });

  it('should display keyboard focus indicators', async () => {
    const page = getPage();
    await page.goto(getBaseUrl());

    // Take screenshot with focus on the first interactive element
    await page.keyboard.press('Tab');

    // Find the currently focused element
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName !== 'BODY'; // Check if focus moved from body
    });

    // Verify something is actually focused
    assert.ok(focusedElement, 'An element should be focused after pressing Tab');

    // Take a screenshot with the focus visible
    const focusScreenshot = await expectScreenshot(page, 'homepage-keyboard-focus');
    assert.ok(focusScreenshot, 'Should have keyboard focus screenshot');
  });
});
