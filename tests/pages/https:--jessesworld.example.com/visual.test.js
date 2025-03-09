/**
 * Homepage visual tests
 */
import { expect, test } from '@playwright/test';

test.describe('Homepage - Visual', () => {
	test('matches visual baseline', async ({ page, baseURL }) => {
		await page.goto(baseURL);

		// Wait for any animations to complete
		await page.waitForTimeout(1000);

		// Compare full page screenshot
		await expect(page).toHaveScreenshot('homepage-desktop.png');
	});

	test('matches visual baseline on mobile', async ({ page, baseURL }) => {
		// Set viewport to mobile size
		await page.setViewportSize({ width: 375, height: 667 });

		await page.goto(baseURL);
		await page.waitForTimeout(1000);

		await expect(page).toHaveScreenshot('homepage-mobile.png');
	});
});
