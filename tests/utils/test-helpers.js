import fs from 'fs';
/**
 * Common test helpers used across multiple test files
 */
import path from 'path';

/**
 * Clears browser storage and preferences
 * @param {Page} page - Playwright page object
 */
export async function clearPreferences(page) {
  try {
    await page.context().clearCookies();

    // Make sure we're on a page before trying to access localStorage
    const currentUrl = page.url();
    if (!currentUrl.startsWith('http')) {
      await page.goto('/');
    }

    // Clear localStorage with proper error handling
    await page.evaluate(() => {
      try {
        localStorage.clear();
        return true;
      } catch (e) {
        console.error('Failed to clear localStorage:', e);
        return false;
      }
    });
  } catch (error) {
    console.warn('Error in clearPreferences:', error.message);
  }
}

/**
 * Helper function to find the theme toggle element using multiple strategies
 * @param {Page} page - Playwright page object
 */
export async function findToggleElement(page) {
  // Try various selector strategies in order of preference

  // 1. Proper accessible switch role
  try {
    const toggle = page.getByRole('switch', { name: /toggle theme/i });
    if (await toggle.isVisible({ timeout: 2000 }).catch(() => {return false})) {
      return toggle;
    }
  } catch (e) {
    console.log('Switch role selector failed:', e.message);
  }

  // 2. Try button role with theme-related text
  try {
    const toggleButton = page.getByRole('button', { name: /(theme|dark|light|mode)/i });
    if (await toggleButton.isVisible({ timeout: 2000 }).catch(() => {return false})) {
      return toggleButton;
    }
  } catch (e) {
    console.log('Button role selector failed:', e.message);
  }

  // 3. Try common theme toggle class names or IDs
  const possibleSelectors = [
    '#theme-toggle',
    '.theme-toggle',
    '#darkModeToggle',
    '.dark-mode-toggle',
    '[aria-label*="theme" i]',
    '[data-testid="theme-toggle"]'
  ];

  const elements = await Promise.all(
		possibleSelectors.map((selector) => {
			return page
				.locator(selector)
				.isVisible({ timeout: 1000 })
				.catch(() => {
					return false;
				});
		}),
  );
  for (let i = 0; i < elements.length; i++) {
		if (elements[i]) {
			console.log('Found toggle with selector:', possibleSelectors[i]);
			return page.locator(possibleSelectors[i]);
		}
  }

  // 4. Last resort - look for any icon button that might be the theme toggle
  try {
    const allButtons = await page.locator('button').all();
    for (const button of allButtons) {
      const hasIcon = await button.locator('svg, img, i').count() > 0;
      if (hasIcon) {
        const text = await button.textContent();
        if (!text || text.trim() === '') {
          console.log('Found potential icon-only button that might be theme toggle');
          return button;
        }
      }
    }
  } catch (e) {
    console.log('Icon button search failed:', e.message);
  }

  return null;
}

/**
 * Wait for a specified time
 * @param {number} ms - Milliseconds to wait
 */
export async function wait(ms) {
  return new Promise(resolve => {return setTimeout(resolve, ms)});
}
