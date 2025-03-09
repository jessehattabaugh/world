/**
 * Contact performance tests
 */
import { test, expect } from '@playwright/test';
import { getBrowserPerformanceMetrics, assertPerformanceBaseline } from '../../utils/performance-utils.js';

const pageUrl = 'https://jessesworld.example.com/contact';
const pageName = 'Contact';
const pageId = 'https:--jessesworld.example.com-contact';

test.describe('Contact - Performance', () => {
  test('meets performance baseline requirements', async ({ page }) => {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    // Collect browser performance metrics
    const metrics = await getBrowserPerformanceMetrics(page);

    // Compare against baseline
    await assertPerformanceBaseline(pageId, metrics);

    // Assert specific thresholds for critical metrics
    expect(metrics.FCP).toBeLessThan(2000, 'FCP should be under 2 seconds');
    if (metrics.LCP !== undefined) {
      expect(metrics.LCP).toBeLessThan(2500, 'LCP should be under 2.5 seconds');
    }
    if (metrics.CLS !== undefined) {
      expect(metrics.CLS).toBeLessThan(0.1, 'CLS should be under 0.1');
    }
  });
});
