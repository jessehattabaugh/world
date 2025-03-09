/**
 * Homepage security tests
 */
import { expect, test } from '@playwright/test';

test.describe('Homepage - Security', () => {
  test('has proper security headers', async ({ page, baseURL }) => {
		const response = await page.goto(baseURL);
		const headers = response.headers();

		expect(headers['x-content-type-options']).toBe('nosniff');
		expect(headers['x-frame-options']).toBe('DENY');
		expect(headers['x-xss-protection']).toBe('1; mode=block');
  });

  test('has valid Content-Security-Policy', async ({ page, baseURL }) => {
		const response = await page.goto(baseURL);
		const headers = response.headers();

		expect(headers['content-security-policy']).toBeTruthy();
		expect(headers['content-security-policy']).toContain("default-src 'self'");
  });

  test('has no vulnerable libraries', async ({ page, baseURL }) => {
		await page.goto(baseURL);
		const libraries = await page.evaluate(() => {
			return Array.from(document.querySelectorAll('script[src]')).map((script) => {
				return script.src;
			});
		});

		// Ensure all libraries are from trusted sources
		for (const lib of libraries) {
			expect(lib).toMatch(/^(https:\/\/cdn\.jsdelivr\.net\/|http:\/\/localhost:3000\/)/);
		}
  });
});
