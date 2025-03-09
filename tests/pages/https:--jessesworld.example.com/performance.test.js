/**
 * Homepage performance tests
 */
import { expect, test } from '@playwright/test';

test.describe('Homepage - Performance', () => {
  test('meets performance baseline requirements', async ({ page, baseURL }) => {
		// Record performance metrics
		const perfMetrics = [];

		page.on('metrics', (data) => {
			perfMetrics.push(data.metrics);
		});

		const response = await page.goto(baseURL);
		const timing = await page.evaluate(() => {
			return JSON.stringify(performance.timing);
		});
		const timingData = JSON.parse(timing);

		// Verify load time is under threshold
		const loadTime = timingData.loadEventEnd - timingData.navigationStart;
		expect(loadTime).toBeLessThan(3000); // 3 seconds max

		// Check Time to First Byte (TTFB)
		const ttfb = timingData.responseStart - timingData.navigationStart;
		expect(ttfb).toBeLessThan(600); // 600ms max

		// Verify response size
		const headers = response.headers();
		if (headers['content-length']) {
			const size = parseInt(headers['content-length'], 10);
			expect(size).toBeLessThan(500000); // 500KB max
		}
  });
});
