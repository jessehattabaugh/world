/**
 * Core Web Vitals performance tests
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createPageFixture, getBaseUrl } from '../setup.js';

describe('Core Web Vitals', () => {
  const getPage = createPageFixture();

  it('homepage meets core web vital thresholds', async () => {
    const page = getPage();
    // Enable performance metrics collection
    await page.goto(getBaseUrl(), { waitUntil: 'networkidle' });

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      return {
        // Core Web Vitals
        FCP: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        LCP: 0, // We'll use PerformanceObserver in the page to get this
        CLS: 0, // We'll use PerformanceObserver in the page to get this
        TTI: performance.timing.domInteractive - performance.timing.navigationStart,
        TBT: 0, // Total Blocking Time is complex to measure in this context

        // Navigation Timing API metrics
        TTFB: performance.timing.responseStart - performance.timing.navigationStart,
        domLoad:
          performance.timing.domContentLoadedEventEnd -
          performance.timing.navigationStart,
        fullLoad: performance.timing.loadEventEnd - performance.timing.navigationStart,
      };
    });

    // Inject and run more advanced metrics gathering
    await page.evaluate(() => {
      return new Promise((resolve) => {
        // Measure LCP
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            const lcpEntry = entries[entries.length - 1];
            window.lcpValue = lcpEntry.startTime;
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // Measure CLS
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          window.clsValue = clsValue;
        }).observe({ type: 'layout-shift', buffered: true });

        // Wait to ensure metrics are collected
        setTimeout(() => {
          resolve();
        }, 1000);
      });
    });

    // Get the additional metrics we collected
    const additionalMetrics = await page.evaluate(() => {
      return {
        LCP: window.lcpValue || 0,
        CLS: window.clsValue || 0,
      };
    });

    // Combine all metrics
    const allMetrics = {
      ...metrics,
      LCP: additionalMetrics.LCP,
      CLS: additionalMetrics.CLS,
    };

    console.log('Performance metrics:', allMetrics);

    // Assert against thresholds from the config
    assert.ok(allMetrics.FCP < 2000, `FCP should be under 2000ms (was ${allMetrics.FCP}ms)`);
    assert.ok(allMetrics.LCP < 2500, `LCP should be under 2500ms (was ${allMetrics.LCP}ms)`);
    assert.ok(allMetrics.TTI < 3500, `TTI should be under 3500ms (was ${allMetrics.TTI}ms)`);
    assert.ok(allMetrics.CLS < 0.1, `CLS should be under 0.1 (was ${allMetrics.CLS})`);

    // Additional assertions on other metrics
    assert.ok(allMetrics.TTFB < 800, `TTFB should be under 800ms (was ${allMetrics.TTFB}ms)`);
    assert.ok(allMetrics.domLoad < 1500, `DOM Load should be under 1500ms (was ${allMetrics.domLoad}ms)`);
  });
});
