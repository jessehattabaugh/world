/**
 * Theme toggle performance tests
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createPageFixture, getBaseUrl } from '../../setup.js';
import { findToggleElement, clearPreferences } from '../../utils/test-helpers.js';
import { assertPerformanceBaseline } from '../../utils/performance-utils.js';

describe('Theme Toggle - Performance', () => {
  const getPage = createPageFixture();

  it('meets performance baseline', async () => {
    const page = getPage();
    await clearPreferences(page);
    await page.goto(getBaseUrl());

    // Find the theme toggle
    const themeToggle = await findToggleElement(page);
    assert.ok(themeToggle !== null, 'Theme toggle should be found');

    // Click toggle and measure performance
    // Use performance.now() inside the page to measure operation time
    const toggleOperationTime = await page.evaluate(async () => {
      const themeToggle = document.querySelector('theme-toggle');

      // Measure time to toggle theme
      const start = performance.now();

      // Simulate a click on the toggle button
      const toggleButton = themeToggle?.shadowRoot?.querySelector('button');
      toggleButton?.click();

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
    assert.ok(
      toggleOperationTime.operationTime < 500,
      `Toggle operation should be under 500ms (was ${toggleOperationTime.operationTime}ms)`
    );
  });
});
