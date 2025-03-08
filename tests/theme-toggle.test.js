import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import {
	assertPerformanceBaseline,
} from './utils/performance-utils.js';

/**
 * Tests for the theme toggle component
 */

// Ensure snapshots directory exists
const snapshotDir = path.join(process.cwd(), 'snapshots');
if (!fs.existsSync(snapshotDir)) {
	fs.mkdirSync(snapshotDir, { recursive: true });
}

// Helper function to set dark mode before tests
async function enableDarkMode(page) {
	await page.context().addInitScript(() => {
		window.localStorage.setItem('theme-preference', 'dark');
	});
}

test.describe('Theme Toggle', () => {
	// Setup helper to clear preferences before tests
	async function clearPreferences(page) {
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

	// Start tests in dark mode
	test.beforeEach(async ({ page }) => {
		await enableDarkMode(page);
	});

	// Added from example.test.js
	test('user preferences are respected', async ({ page }) => {
		await page.goto('/');

		// Test theme toggle functionality
		const themeToggle = page.getByRole('switch', { name: /toggle theme/i });

		// Get initial theme state
		const initialIsDarkMode = await page.evaluate(() => {
			return document.documentElement.classList.contains('dark-mode');
		});

		// Verify we start in dark mode
		expect(initialIsDarkMode).toBeTruthy({
			message: '🌓 Page should start in dark mode'
		});

		// Change theme
		await themeToggle.click();

		// Verify theme changed
		const newIsDarkMode = await page.evaluate(() => {
			return document.documentElement.classList.contains('dark-mode');
		});
		expect(newIsDarkMode).not.toBe(initialIsDarkMode, {
			message: '🌓 Theme should change after clicking toggle'
		});

		// Reload the page to verify persistence
		await page.reload();

		// Verify preference was remembered
		const persistedIsDarkMode = await page.evaluate(() => {
			return document.documentElement.classList.contains('dark-mode');
		});
		expect(persistedIsDarkMode).toBe(newIsDarkMode, {
			message: '💾 Theme preference should be remembered after page reload'
		});
	});

	test('toggle functionality changes theme', async ({ page }) => {
		await clearPreferences(page);
		await page.goto('/');

		// Find the theme toggle
		const themeToggle = await findToggleElement(page);
		await expect(themeToggle).toBeVisible({
			message: '🔍 Theme toggle should be visible on the page'
		});

		// Get initial theme state
		const initialIsDark = await page.evaluate(() => {
			return document.documentElement.classList.contains('dark-mode');
		});

		// Take screenshot before clicking
		await expect(themeToggle).toHaveScreenshot('theme-toggle-before-click-baseline.png', {
			message: '📸 Theme toggle should match baseline before click'
		});

		// Click toggle and check if theme changed
		await themeToggle.click();
		await page.waitForTimeout(300);

		// Take screenshot after clicking
		await expect(themeToggle).toHaveScreenshot('theme-toggle-after-click-baseline.png', {
			message: '📸 Theme toggle should match baseline after click'
		});

		const newIsDark = await page.evaluate(() => {
			return document.documentElement.classList.contains('dark-mode');
		});
		expect(newIsDark).not.toBe(initialIsDark, {
			message: '🌓 Theme mode should toggle between light and dark'
		});
	});

	test('toggle remembers preference after reload', async ({ page }) => {
		await clearPreferences(page);
		await page.goto('/');

		// Find the theme toggle
		const themeToggle = await findToggleElement(page);

		// Get initial theme state
		const initialIsDark = await page.evaluate(() => {
			return document.documentElement.classList.contains('dark-mode');
		});

		// Click toggle and check if theme changed
		await themeToggle.click();
		await page.waitForTimeout(300);

		// Reload the page
		await page.reload();
		await page.waitForTimeout(300);

		// Check if theme preference was remembered
		const rememberedIsDark = await page.evaluate(() => {
			return document.documentElement.classList.contains('dark-mode');
		});
		expect(rememberedIsDark).not.toBe(initialIsDark);

		// Take screenshot of remembered state
		await expect(themeToggle).toHaveScreenshot('theme-toggle-remembered-baseline.png');
	});

	test('toggle is keyboard accessible', async ({ page }) => {
		await page.goto('/');

		// Tab to the toggle
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');

		// Check if toggle is focused
		const focused = await page.evaluate(() => {
			const el = document.activeElement;
			return (
				el.getAttribute('role') === 'switch' &&
				el.getAttribute('aria-label')?.toLowerCase().includes('toggle theme')
			);
		});
		expect(focused).toBeTruthy();

		// Take screenshot with focus
		await expect(page).toHaveScreenshot('theme-toggle-focused-baseline.png');

		// Activate with Enter key
		await page.keyboard.press('Enter');
		await page.waitForTimeout(200);

		// Take screenshot after keyboard activation
		await expect(page).toHaveScreenshot('theme-toggle-keyboard-activated-baseline.png');
	});

	test('system preference mode works correctly', async ({ page }) => {
		// Set to system mode
		await page.goto('/');
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
		expect(isDarkWithSystemDark).toBeTruthy();

		// Take screenshot with system dark preference
		await expect(page).toHaveScreenshot('theme-toggle-system-dark-baseline.png');

		// Test with light system preference
		await page.emulateMedia({ colorScheme: 'light' });
		await page.reload();
		const isDarkWithSystemLight = await page.evaluate(() => {
			return document.documentElement.classList.contains('dark-mode');
		});
		expect(isDarkWithSystemLight).toBeFalsy();

		// Take screenshot with system light preference
		await expect(page).toHaveScreenshot('theme-toggle-system-light-baseline.png');
	});

	test('theme toggle component meets performance baseline', async ({ page, browserName }) => {
		await clearPreferences(page);
		await page.goto('/');

		// Find the theme toggle with additional wait and retry logic
		let themeToggle = null;
		const maxRetries = 3;

		for (let attempt = 0; attempt < maxRetries && !themeToggle; attempt++) {
			// Wait longer between attempts
			if (attempt > 0) {
				console.log(`Retry attempt ${attempt + 1} to find theme toggle`);
				await page.waitForTimeout(1000);
			}

			themeToggle = await findToggleElement(page);
		}

		if (!themeToggle) {
			console.error('Could not find theme toggle element after multiple attempts');
			// Take a screenshot for debugging
			await page.screenshot({ path: 'toggle-not-found.png' });

			// Log the page HTML for debugging
			const html = await page.content();
			console.log('Page HTML:', `${html.substring(0, 1000)  }...`);
		}

		// Now check if the element is there before attempting to interact
		await expect(themeToggle).not.toBeNull();
		await expect(themeToggle).toBeVisible();

		// Click toggle and measure performance
		// Use performance.now() inside the page to measure operation time
		const toggleOperationTime = await page.evaluate(async () => {
			const themeToggle = document.querySelector('theme-toggle');

			// Measure time to toggle theme
			const start = performance.now();

			// Simulate a click on the toggle button
			const toggleButton = themeToggle.shadowRoot.querySelector('button');
			toggleButton.click();

			// Wait for any animations
			await new Promise((r) => {
				setTimeout(r, 300);
			});

			const end = performance.now();
			return {
				operationTime: end - start,
				domChanges: performance.getEntriesByType('resource').length,
				memoryUsage: performance.memory
					? {
							jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
							totalJSHeapSize: performance.memory.totalJSHeapSize,
							usedJSHeapSize: performance.memory.usedJSHeapSize,
					  }
					: null,
			};
		});

		console.log('Theme toggle performance:', toggleOperationTime);

		// Compare against baseline or save new baseline
		await assertPerformanceBaseline('theme-toggle', toggleOperationTime);

		// Ensure theme toggle operation is fast
		expect(toggleOperationTime.operationTime).toBeLessThan(500); // Toggle should be under 500ms
	});

	/**
	 * Helper function to try multiple selector strategies to find the theme toggle
	 */
	async function findToggleElement(page) {
		const isMobileSafari = await page.evaluate(() => {
			const {userAgent} = navigator;
			return /iPhone|iPad/i.test(userAgent) && /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
		});

		// In mobile Safari, we might need additional waiting time or different selectors
		if (isMobileSafari) {
			// Try multiple selectors that might match the theme toggle
			console.log('Mobile Safari detected, using enhanced toggle detection');

			// Wait longer for mobile Safari
			await page.waitForTimeout(1000);

			// Try different possible selectors for the theme toggle
			const selectors = [
				'[data-testid="theme-toggle"]',
				'.theme-toggle',
				'button[aria-label*="theme"]',
				'button.theme-switch',
				// Add any other potential selectors
			];

			// Try each selector
			for (const selector of selectors) {
				try {
					const element = await page.$(selector);
					if (element) {
						console.log(`Found theme toggle with selector: ${selector}`);
						return element;
					}
				} catch (e) {
					console.log(`Selector ${selector} failed: ${e.message}`);
				}
			}

			console.error('Theme toggle not found in mobile Safari with any known selectors');
			return null;
		}

		// Original implementation for other browsers
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

		for (const selector of possibleSelectors) {
			try {
				const element = page.locator(selector);
				if (await element.isVisible({ timeout: 1000 }).catch(() => {return false})) {
					console.log('Found toggle with selector:', selector);
					return element;
				}
			} catch (e) {
				// Continue to next selector
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
});
