/**
 * Homepage accessibility tests
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createPageFixture, getBaseUrl, expectScreenshot } from '../../setup.js';

describe('Homepage - Accessibility', () => {
  const getPage = createPageFixture();

  it('should have proper keyboard navigation', async () => {
    const page = getPage();
    await page.goto(getBaseUrl());

    // Tab through the page to check focus indication
    await page.keyboard.press('Tab');

    // Find the currently focused element
    const firstFocusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el.tagName,
        role: el.getAttribute('role'),
        text: el.textContent?.trim(),
        isFocused: el !== document.body
      };
    });

    // Verify something is actually focused
    assert.ok(firstFocusedElement.isFocused, 'An element should be focused after pressing Tab');

    // Take a screenshot with the focus visible
    const focusScreenshot = await expectScreenshot(page, 'homepage-keyboard-focus-first');
    assert.ok(focusScreenshot, 'Should have keyboard focus screenshot');

    // Tab again to move focus to the next element
    await page.keyboard.press('Tab');

    // Check if focus moved to a different element
    const secondFocusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el.tagName,
        role: el.getAttribute('role'),
        text: el.textContent?.trim(),
        isFocused: el !== document.body
      };
    });

    // Verify focus moved to a different element
    assert.ok(secondFocusedElement.isFocused, 'Focus should move to second element');
    assert.notDeepStrictEqual(
      firstFocusedElement,
      secondFocusedElement,
      'Focus should move to a different element'
    );
  });

  it('should respect reduced motion preferences', async () => {
    const page = getPage();

    // Emulate a user who prefers reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(getBaseUrl());

    // Check if the page respects reduced motion preference
    const hasReducedMotionIndicator = await page.evaluate(() => {
      return document.documentElement.classList.contains('reduced-motion') ||
             getComputedStyle(document.documentElement).getPropertyValue('--reduced-motion') === 'true' ||
             getComputedStyle(document.documentElement).getPropertyValue('--prefers-reduced-motion') === 'reduce';
    });

    assert.ok(hasReducedMotionIndicator, 'Page should respect reduced motion preference');
  });

  it('should have properly labeled interactive elements', async () => {
    const page = getPage();
    await page.goto(getBaseUrl());

    // Find all buttons and links
    const interactiveElements = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
      const links = Array.from(document.querySelectorAll('a[href], [role="link"]'));

      return [...buttons, ...links].map(el => {
        // Check for various ways an element might be labeled
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const innerText = el.textContent?.trim();

        let labelledByText = null;
        if (ariaLabelledBy) {
          const labelElement = document.getElementById(ariaLabelledBy);
          labelledByText = labelElement?.textContent?.trim();
        }

        return {
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role'),
          hasLabel: !!(ariaLabel || labelledByText || (innerText && innerText.length > 0)),
          label: ariaLabel || labelledByText || innerText
        };
      });
    });

    // Check if all interactive elements have accessible labels
    const unlabeledElements = interactiveElements.filter(el => {return !el.hasLabel});
    assert.strictEqual(
      unlabeledElements.length,
      0,
      `All interactive elements should have labels, found ${unlabeledElements.length} unlabeled elements`
    );
  });
});
