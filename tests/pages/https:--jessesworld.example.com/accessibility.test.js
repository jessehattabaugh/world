import { checkA11y, injectAxe } from '../../utils/accessibility-utils.js';
/**
 * Homepage accessibility tests
 */
import { expect, test } from '@playwright/test';

test.describe('Homepage - Accessibility', () => {
  test('meets accessibility standards', async ({ page, baseURL }) => {
		await page.goto(baseURL, { waitUntil: 'networkidle' });
		await injectAxe(page);

		// Run axe accessibility tests
		const violations = await checkA11y(page);
		expect(violations.length, 'No accessibility violations should be detected').toBe(0);
  });

  test('has proper keyboard navigation', async ({ page, baseURL }) => {
		await page.goto(baseURL, { waitUntil: 'networkidle' });

		// Tab through interactive elements
		await page.keyboard.press('Tab');

		// Verify focus is visible
		const focusedElement = await page.evaluate(() => {
			const el = document.activeElement;
			return el?.tagName !== 'BODY';
		});

		expect(focusedElement, 'An element should be focused after pressing Tab').toBeTruthy();
  });
});
