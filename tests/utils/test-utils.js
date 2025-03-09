import { test as base, expect } from '@playwright/test';
import { injectAxe, checkA11y } from './accessibility-utils.js';
import { getBrowserPerformanceMetrics, assertPerformanceBaseline } from './performance-utils.js';
import { checkHeaders, testCSP } from './security-utils.js';

// Enhanced test fixture with comprehensive testing capabilities
export const test = base.extend({
  // Accessibility testing fixture
  axeCheck: async ({ page }, use) => {
    await use(async (selector = 'body') => {
      await injectAxe(page);
      const violations = await checkA11y(page, selector);
      expect(violations.length, 'No accessibility violations').toBe(0);
      return violations;
    });
  },

  // Visual testing fixture with multiple viewport support
  visualCheck: async ({ page }, use) => {
    await use(async (name, options = {}) => {
      // Save original viewport
      const originalViewport = page.viewportSize();

      try {
        // Set viewport if specified
        if (options.viewport) {
          await page.setViewportSize(options.viewport);
          await page.waitForTimeout(300); // Allow layout to stabilize
        }

        await expect(page).toHaveScreenshot(`${name}.png`, {
          animations: 'disabled',
          mask: options.mask || [],
          fullPage: options.fullPage !== false,
          ...options
        });
      } finally {
        // Restore original viewport
        if (options.viewport && originalViewport) {
          await page.setViewportSize(originalViewport);
        }
      }
    });
  },

  // Performance testing fixture
  perfCheck: async ({ page }, use) => {
    await use(async (pageId = null) => {
      // Extract pageId from URL if not provided
      if (!pageId) {
        const url = page.url();
        pageId = url.split('/').pop() || 'homepage';
      }

      const metrics = await getBrowserPerformanceMetrics(page);
      const results = await assertPerformanceBaseline(pageId, metrics);
      return { metrics, results };
    });
  },

  // Security testing fixture
  securityCheck: async ({ page, request }, use) => {
    await use(async () => {
      const response = await request.get(page.url());
      const headers = response.headers();
      const headerCheck = await checkHeaders(headers);
      const cspResult = await testCSP(page);

      expect(headerCheck.pass, headerCheck.message).toBeTruthy();
      expect(cspResult.valid, cspResult.message).toBeTruthy();

      return { headers: headerCheck, csp: cspResult };
    });
  },

  // User preferences fixture - simulates different user settings
  withPreferences: async ({ page, context }, use) => {
    await use(async (preferences = {}) => {
      // Apply preferences before page load
      if (preferences.theme) {
        await context.addInitScript(({ theme }) => {
          localStorage.setItem('theme-preference', theme);
        }, { theme: preferences.theme });
      }

      if (preferences.reducedMotion) {
        await page.emulateMedia({ reducedMotion: 'reduce' });
      }

      if (preferences.colorScheme) {
        await page.emulateMedia({ colorScheme: preferences.colorScheme });
      }

      if (preferences.offline) {
        await context.setOffline(true);
      }

      // Return a function to reset preferences
      return async () => {
        await context.clearCookies();
        await page.evaluate(() => {return localStorage.clear()});
        await page.emulateMedia({});
        await context.setOffline(false);
      };
    });
  }
});
