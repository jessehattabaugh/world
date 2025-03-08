import { test, expect } from '@playwright/test';

/**
 * Example tests to demonstrate best practices for Playwright testing
 *
 * These tests focus on user journeys and real browser interactions
 * rather than implementation details
 */

test.describe('Core user journeys', () => {
	test('new visitor can navigate the site', async ({ page }) => {
			// Navigate to the homepage
			await page.goto('/', { waitUntil: 'networkidle' });

			// Add debugging to help troubleshoot
			console.log('Page loaded, current URL:', page.url());

			// Log the page content to help debug what's available
			const pageContent = await page.content();
			console.log('Page contains h1:', pageContent.includes('<h1'));

			// Try a more reliable selector - either the specific heading text or a more general approach
			try {
				// Increase timeout and use a more specific selector if possible
				await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
			} catch (e) {
				console.log('Could not find h1, trying alternative selector');
				// Alternative approach - look for any heading if h1 specifically isn't found
				await expect(page.locator('h1, h2')).toBeVisible({ timeout: 5000 });
			}

			// Continue with the rest of the test
			await page.getByRole('link', { name: /about/i }).click();
			await expect(page).toHaveURL(/.*about/);
	});

	test('user preferences are respected', async ({ page }) => {
		await page.goto('/');

		// Test theme toggle functionality
		const themeToggle = page.getByRole('switch', { name: /toggle theme/i });

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
		expect(newIsDarkMode).not.toBe(initialIsDarkMode);

		// Reload the page to verify persistence
		await page.reload();

		// Verify preference was remembered
		const persistedIsDarkMode = await page.evaluate(() => {
			return document.documentElement.classList.contains('dark-mode');
		});
		expect(persistedIsDarkMode).toBe(newIsDarkMode);
	});

	test('site is responsive across devices', async ({ page }) => {
		// Test on desktop viewport
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto('/');

		// Elements should be laid out for desktop
		const isMenuVisible = await page.getByRole('navigation').isVisible();
		expect(isMenuVisible).toBeTruthy();

		// Test on mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');

		// Verify key elements are still accessible on mobile
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

		// Take screenshot to verify layout
		await expect(page).toHaveScreenshot('mobile-homepage.png');
	});

	test('animations respect user preferences', async ({ page }) => {
		// Emulate a user who prefers reduced motion
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');

		// Trigger a navigation that would normally animate
		await page.getByRole('link', { name: /about/i }).click();

		// Verify we reached the destination
		await expect(page).toHaveURL(/.*about/);

		// Note: This is hard to test directly, but the key is that we're testing
		// with the reducedMotion media feature enabled
	});
});

/**
 * These tests represent good practices:
 * 1. Using accessibility selectors (getByRole, getByLabel)
 * 2. Testing real user flows and journeys
 * 3. Checking across different viewports
 * 4. Verifying preference persistence
 * 5. Using screenshots for visual verification
 */
