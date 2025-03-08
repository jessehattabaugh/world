/**
 * Homepage performance tests
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createPageFixture, getBaseUrl } from '../../setup.js';
import { getBrowserPerformanceMetrics, assertPerformanceBaseline } from '../../utils/performance-utils.js';

describe('Homepage - Performance', () => {
  const getPage = createPageFixture();

  it('meets performance baseline requirements', async () => {
    const page = getPage();
    await page.goto(getBaseUrl(), { waitUntil: 'networkidle' });

    // Collect browser performance metrics
    const metrics = await getBrowserPerformanceMetrics(page);
    console.log('Homepage performance metrics:', metrics);

    // Compare against baseline
    await assertPerformanceBaseline('homepage', metrics);

    // Assert specific thresholds for critical metrics
    assert.ok(metrics.FCP < 2000, `FCP should be under 2000ms (was ${metrics.FCP}ms)`);

    if (metrics.LCP !== undefined) {
      assert.ok(metrics.LCP < 2500, `LCP should be under 2500ms (was ${metrics.LCP}ms)`);
    }

    if (metrics.CLS !== undefined) {
      assert.ok(metrics.CLS < 0.1, `CLS should be under 0.1 (was ${metrics.CLS})`);
    }
  });
});
