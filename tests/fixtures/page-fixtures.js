import { test, expect } from '../utils/test-utils.js';
import { BasePage } from './page-model.js';

/**
 * Create a complete test suite for a page
 * @param {typeof BasePage} PageClass Page class to test
 */
export function createPageTest(PageClass) {
  test.describe(PageClass.prototype.pageTitle || 'Page Tests', () => {
    let page;

    // Create a new page instance for each test
    test.beforeEach(async ({ page: testPage }) => {
      page = new PageClass(testPage);
      await page.goto();
      await page.waitForLoaded();
    });

    // Standard tests that apply to all pages
    test('meets accessibility standards', async ({ axeCheck }) => {
      await page.checkAccessibility(axeCheck);
    });

    test('renders correctly across viewports', async ({ visualCheck }) => {
      // Desktop view
      await visualCheck(`${page.pageId}-desktop`, {
        viewport: { width: 1280, height: 720 }
      });

      // Tablet view
      await visualCheck(`${page.pageId}-tablet`, {
        viewport: { width: 768, height: 1024 }
      });

      // Mobile view
      await visualCheck(`${page.pageId}-mobile`, {
        viewport: { width: 375, height: 667 }
      });
    });

    test('meets performance requirements', async ({ perfCheck }) => {
      const { metrics } = await page.checkPerformance(perfCheck);

      // Assert critical metrics directly
      expect(metrics.FCP).toBeLessThan(2000, 'First Contentful Paint should be fast');
      if (metrics.LCP) {
        expect(metrics.LCP).toBeLessThan(2500, 'Largest Contentful Paint should be fast');
      }
    });

    test('supports keyboard navigation', async ({ page: testPage }) => {
      // Press Tab to move focus to first interactive element
      await testPage.keyboard.press('Tab');

      // Check that focus moved from body to an interactive element
      const focusedElement = await testPage.evaluate(() => {return {
        tag: document.activeElement.tagName,
        role: document.activeElement.getAttribute('role'),
        tabIndex: document.activeElement.tabIndex,
      }});

      expect(focusedElement.tag).not.toBe('BODY', 'Focus should move from body');

      // Continue tabbing and verify focus indicators appear
      await testPage.keyboard.press('Tab');
      await visualCheck(`${page.pageId}-keyboard-focus`, {
        fullPage: false,
        timeout: 5000
      });
    });

    test('adapts to user preferences', async ({ page: testPage, withPreferences }) => {
      // Test dark mode preference
      const resetPrefs = await withPreferences({
        colorScheme: 'dark',
        theme: 'dark'
      });

      // Reload with preferences applied
      await page.goto();

      // Check dark mode applied
      const hasDarkMode = await testPage.evaluate(() =>
        {return document.documentElement.classList.contains('dark-mode') ||
        document.documentElement.dataset.theme === 'dark'}
      );
      expect(hasDarkMode).toBeTruthy('Dark mode should be applied');

      // Take screenshot in dark mode
      await visualCheck(`${page.pageId}-dark-mode`);

      // Reset preferences
      await resetPrefs();
    });
  });
}
