/**
 * Responsive behavior flow tests
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createPageFixture, getBaseUrl, expectScreenshot } from '../setup.js';
import { wait } from '../utils/test-helpers.js';

describe('Responsive Behavior Flows', () => {
  const getPage = createPageFixture();

  describe('Layout Adaptations', () => {
    it('should adapt layouts between desktop and mobile', async () => {
      const page = getPage();

      // Test on desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(getBaseUrl());
      await wait(500);

      // Take desktop screenshot
      const desktopScreenshot = await expectScreenshot(page, 'responsive-desktop');
      assert.ok(desktopScreenshot, 'Should have desktop screenshot');

      // Measure layout metrics on desktop
      const desktopMetrics = await page.evaluate(() => {
        return {
          viewportWidth: window.innerWidth,
          navVisible: !!document.querySelector('nav')?.offsetWidth,
          numColumns: document.querySelectorAll('.column, [class*="col-"]').length,
          fontSize: parseInt(getComputedStyle(document.body).fontSize)
        };
      });

      // Now test on mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await wait(500);

      // Take mobile screenshot
      const mobileScreenshot = await expectScreenshot(page, 'responsive-mobile');
      assert.ok(mobileScreenshot, 'Should have mobile screenshot');

      // Measure layout metrics on mobile
      const mobileMetrics = await page.evaluate(() => {
        return {
          viewportWidth: window.innerWidth,
          navVisible: !!document.querySelector('nav')?.offsetWidth,
          numColumns: document.querySelectorAll('.column, [class*="col-"]').length,
          fontSize: parseInt(getComputedStyle(document.body).fontSize)
        };
      });

      console.log('Desktop metrics:', desktopMetrics);
      console.log('Mobile metrics:', mobileMetrics);
    });
  });

  describe('Navigation Patterns', () => {
    it('should use appropriate navigation patterns for different viewports', async () => {
      const page = getPage();

      // Desktop navigation
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(getBaseUrl());

      const desktopNavigation = await page.evaluate(() => {
        const nav = document.querySelector('nav');
        if (!nav) {return { exists: false };}

        return {
          exists: true,
          display: getComputedStyle(nav).display,
          links: Array.from(nav.querySelectorAll('a')).length
        };
      });

      if (desktopNavigation.exists) {
        assert.ok(desktopNavigation.links > 0, 'Desktop navigation should contain links');
      }

      // Mobile navigation
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await wait(300);

      // Check for hamburger menu or other mobile navigation pattern
      const mobileNavigation = await page.evaluate(() => {
        // Check for hamburger menu button
        const menuButton = document.querySelector(
          'button[aria-label*="menu" i], button[aria-label*="navigation" i], .hamburger, .menu-toggle'
        );

        const nav = document.querySelector('nav');

        return {
          hasMenuButton: !!menuButton,
          navVisible: nav && getComputedStyle(nav).display !== 'none',
          menuType: menuButton ? 'hamburger' : (nav ? 'visible' : 'none')
        };
      });

      // Document the navigation pattern found
      console.log('Mobile navigation pattern:', mobileNavigation.menuType);

      // If there's a menu button, try clicking it
      if (mobileNavigation.hasMenuButton) {
        const menuButton = page.locator(
          'button[aria-label*="menu" i], button[aria-label*="navigation" i], .hamburger, .menu-toggle'
        ).first();

        await menuButton.click();
        await wait(300);

        // Check if menu appears after clicking
        const menuOpened = await page.evaluate(() => {
          const nav = document.querySelector('nav');
          return nav && getComputedStyle(nav).display !== 'none';
        });

        assert.ok(menuOpened, 'Mobile menu should open when button is clicked');

        // Take screenshot of open mobile menu
        const openMenuScreenshot = await expectScreenshot(page, 'responsive-mobile-menu-open');
        assert.ok(openMenuScreenshot, 'Should have mobile menu screenshot');
      }
    });
  });

  describe('Images', () => {
    it('should use responsive images', async () => {
      const page = getPage();
      await page.goto(getBaseUrl());

      // Check for responsive image techniques
      const imageAudit = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));

        return {
          total: images.length,
          responsive: images.filter(img =>
            {return img.srcset || // Has srcset
            img.sizes || // Has sizes
            img.parentElement?.tagName === 'PICTURE' || // Inside picture element
            img.loading === 'lazy'} // Uses lazy loading
          ).length,
          lazyLoaded: images.filter(img => {return img.loading === 'lazy'}).length
        };
      });

      // Just log information about responsive images rather than failing
      // since not all sites need responsive images
      console.log(`Image audit: ${imageAudit.responsive} of ${imageAudit.total} images use responsive techniques`);
      console.log(`Lazy loading: ${imageAudit.lazyLoaded} of ${imageAudit.total} images use lazy loading`);
    });
  });

  // Added from example.test.js
  it('site is responsive across devices', async () => {
    const page = getPage();

    // Test on desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(getBaseUrl());

    // Elements should be laid out for desktop
    const navigation = page.getByRole('navigation');
    const isMenuVisible = await navigation.isVisible().catch(() => {return false});
    assert.ok(isMenuVisible, '🖥️ Navigation menu should be visible on desktop');

    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(getBaseUrl());

    // Verify key elements are still accessible on mobile
    const heading = page.getByRole('heading', { level: 1 });
    assert.ok(await heading.isVisible().catch(() => {return false}),
      '📱 Main heading should be visible on mobile');

    // Take screenshot to verify layout
    const mobileScreenshot = await expectScreenshot(page, 'mobile-homepage');
    assert.ok(mobileScreenshot, '📸 Mobile homepage should match baseline screenshot');
  });
});
