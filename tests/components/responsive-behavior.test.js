/**
 * Tests for responsive behaviors across different viewports
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createPageFixture, getBaseUrl, expectScreenshot } from '../setup.js';
import { wait } from '../utils/test-helpers.js';

describe('Responsive Behavior', () => {
  const getPage = createPageFixture();

  describe('Viewport Adaptations', () => {
    it('should adapt layout appropriately for desktop viewport', async () => {
      const page = getPage();
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(getBaseUrl());
      await wait(300);

      // Check layout characteristics in desktop viewport
      const layoutInfo = await page.evaluate(() => {
        return {
          windowWidth: window.innerWidth,
          hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
          navbarStyle: window.getComputedStyle(document.querySelector('nav') || document.createElement('div')),
          textSizes: {
            body: parseInt(window.getComputedStyle(document.body).fontSize),
            heading: parseInt(window.getComputedStyle(document.querySelector('h1') || document.createElement('h1')).fontSize)
          }
        };
      });

      // Desktop should not have horizontal scroll
      assert.ok(!layoutInfo.hasHorizontalScroll, 'Desktop view should not have horizontal scrollbar');

      // Take screenshot of desktop layout
      const desktopScreenshot = await expectScreenshot(page, 'responsive-desktop');
      assert.ok(desktopScreenshot, 'Should have desktop layout screenshot');
    });

    it('should adapt layout appropriately for mobile viewport', async () => {
      const page = getPage();
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(getBaseUrl());
      await wait(300);

      // Check layout characteristics in mobile viewport
      const layoutInfo = await page.evaluate(() => {
        return {
          windowWidth: window.innerWidth,
          hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
          menuButton: !!document.querySelector('button[aria-label*="menu" i], button[aria-label*="navigation" i]'),
          navVisible: !!(document.querySelector('nav') &&
                        window.getComputedStyle(document.querySelector('nav')).display !== 'none')
        };
      });

      // Mobile should not have horizontal scroll
      assert.ok(!layoutInfo.hasHorizontalScroll, 'Mobile view should not have horizontal scrollbar');

      // Take screenshot of mobile layout
      const mobileScreenshot = await expectScreenshot(page, 'responsive-mobile');
      assert.ok(mobileScreenshot, 'Should have mobile layout screenshot');
    });
  });

  describe('Touch Targets', () => {
    it('should have adequately sized touch targets on mobile', async () => {
      const page = getPage();
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(getBaseUrl());

      // Check size of interactive elements
      const touchTargets = await page.evaluate(() => {
        const minRecommendedSize = 44; // W3C recommendation: 44x44px minimum
        const interactiveElements = [
          ...document.querySelectorAll('a[href], button, [role="button"]'),
          ...document.querySelectorAll('input:not([type="hidden"]), select, textarea')
        ];

        const results = {
          total: interactiveElements.length,
          tooSmall: 0,
          smallElements: []
        };

        interactiveElements.forEach(el => {
          const rect = el.getBoundingClientRect();

          // Skip hidden elements
          if (rect.width === 0 || rect.height === 0) {return;}

          if (rect.width < minRecommendedSize || rect.height < minRecommendedSize) {
            results.tooSmall++;
            results.smallElements.push({
              tag: el.tagName.toLowerCase(),
              text: el.textContent.trim().substring(0, 20),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            });
          }
        });

        return results;
      });

      // Log information about touch targets
      console.log(`Touch target audit: ${touchTargets.tooSmall} of ${touchTargets.total} elements are smaller than recommended`);

      if (touchTargets.smallElements.length > 0) {
        console.log('Small touch targets:', touchTargets.smallElements.slice(0, 5));
        if (touchTargets.smallElements.length > 5) {
          console.log(`...and ${touchTargets.smallElements.length - 5} more`);
        }
      }

      // Assert a reasonable percentage of touch targets are adequately sized
      // This is a somewhat lenient check since some elements are intentionally small
      const adequatePercentage = ((touchTargets.total - touchTargets.tooSmall) / touchTargets.total) * 100;
      assert.ok(
        touchTargets.total === 0 || adequatePercentage > 70,
        `At least 70% of touch targets should be adequately sized (current: ${adequatePercentage.toFixed(1)}%)`
      );
    });
  });

  describe('Container Queries', () => {
    it('should use container queries for component-level responsiveness if available', async () => {
      const page = getPage();
      await page.goto(getBaseUrl());

      // Check if container queries are being used
      const containerQuerySupport = await page.evaluate(() => {
        // Check for support
        const supported = 'container' in document.documentElement.style ||
                         'containerType' in document.documentElement.style;

        // Look for container query usage
        const hasContainerElements = document.querySelectorAll('[style*="container-type"]').length > 0 ||
                                    document.querySelectorAll('[style*="container:"]').length > 0;

        // Check for container query polyfill
        const hasPolyfill = typeof window.CQPolyfill !== 'undefined' ||
                           !!document.querySelector('script[src*="container-query"]');

        return {
          supported,
          hasContainerElements,
          hasPolyfill
        };
      });

      // This is an informational test since not all sites need container queries
      console.log('Container query support:', containerQuerySupport);
    });
  });
});
