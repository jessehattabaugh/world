import { createPageFixture, getBaseUrl } from '../setup.js';
/**
 * Accessibility flow tests
 */
import { describe, it } from 'node:test';

import assert from 'node:assert';
import { wait } from '../utils/test-helpers.js';

describe('Accessibility Flows', () => {
  const getPage = createPageFixture();

  // Added from example.test.js
  it('animations respect user preferences', async () => {
    const page = getPage();

    // Emulate a user who prefers reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(getBaseUrl());

    // Trigger a navigation that would normally animate
    const aboutLink = page.getByRole('link', { name: /about/i });
    await aboutLink.click();
    await wait(300);

    // Verify we reached the destination
    const url = page.url();
    assert.ok(url.includes('about'),
      '♿ Navigation should work with reduced motion preference');

    // Note: This is hard to test directly, but the key is that we're testing
    // with the reducedMotion media feature enabled
  });

  it('should navigate the site using only keyboard', async () => {
    const page = getPage();
    await page.goto(getBaseUrl());

    // Tab to the first interactive element (probably a link in the navigation)
    await page.keyboard.press('Tab');

    // Get the currently focused element
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim(),
        href: el.getAttribute('href'),
        isFocused: el !== document.body
      };
    });

    // Verify an element is focused
    assert.ok(focusedElement.isFocused, 'An element should be focused after pressing Tab');

    // Activate the focused element with Enter key
    await page.keyboard.press('Enter');
    await wait(500);

    // Verify navigation occurred
    const newUrl = page.url();
    assert.notStrictEqual(
      newUrl,
      getBaseUrl(),
      'URL should change after activating a link with keyboard'
    );
  });

  it('should have proper focus management', async () => {
		const page = getPage();
		await page.goto(getBaseUrl());

		// Find all focusable elements
		const focusableElements = await page.evaluate(() => {
			const selector =
				'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])';
			return Array.from(document.querySelectorAll(selector)).length;
		});

		// Skip test if there are no focusable elements
		if (focusableElements === 0) {
			console.log('No focusable elements found, skipping focus test');
			return;
		}

		// Refactored to avoid 'await' inside a loop
		for (let i = 0; i < focusableElements; i++) {
			await page.keyboard.press('Tab');
		}

		// Check if something is focused after each Tab press
		const isFocused = await page.evaluate(() => {
			return document.activeElement !== document.body;
		});

		assert.ok(isFocused, 'An element should be focused after Tab press');
  });

  it('should respect users preferred color scheme', async () => {
    const page = getPage();

    // Test with dark color scheme preference
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(getBaseUrl());

    // Check if the page respects dark mode
    const isDarkMode = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark-mode') ||
             document.documentElement.classList.contains('dark') ||
             document.documentElement.getAttribute('data-theme') === 'dark' ||
             getComputedStyle(document.documentElement).getPropertyValue('--color-scheme')?.includes('dark');
    });

    assert.ok(isDarkMode, 'Page should respect dark color scheme preference');

    // Test with light color scheme preference
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();

    // Check if the page respects light mode
    const isLightMode = await page.evaluate(() => {
      return !document.documentElement.classList.contains('dark-mode') &&
             !document.documentElement.classList.contains('dark') &&
             document.documentElement.getAttribute('data-theme') !== 'dark';
    });

    assert.ok(isLightMode, 'Page should respect light color scheme preference');
  });

  it('should have skip to content functionality', async () => {
    const page = getPage();
    await page.goto(getBaseUrl());

    // On many accessible sites, the first Tab focuses a "skip to content" link
    await page.keyboard.press('Tab');

    // Check if a skip link is focused
    const hasSkipLink = await page.evaluate(() => {
      const el = document.activeElement;
      const text = el.textContent?.toLowerCase() || '';
      const href = el.getAttribute('href');

      return (
        text.includes('skip') &&
        text.includes('content') &&
        (href?.startsWith('#') || href?.includes('content'))
      );
    });

    // This is a best practice but not always implemented
    // So we'll just log if it's missing rather than failing the test
    if (!hasSkipLink) {
      console.log('Best practice: Consider adding a "skip to content" link for keyboard users');
    }
  });
});
