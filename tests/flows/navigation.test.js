/**
 * Navigation flow tests
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createPageFixture, getBaseUrl, expectScreenshot } from '../setup.js';
import { wait } from '../utils/test-helpers.js';

describe('Navigation Flows', () => {
  const getPage = createPageFixture();

  it('should allow users to navigate through the site', async () => {
    const page = getPage();
    await page.goto(getBaseUrl());

    // Find and click navigation link
    const aboutLink = page.getByRole('link', { name: /about/i });
    await aboutLink.click();

    // Verify navigation was successful
    const currentUrl = page.url();
    assert.ok(currentUrl.includes('about'), `URL should include 'about' (was ${currentUrl})`);

    // Verify page content loaded
    const heading = page.getByRole('heading');
    await heading.waitFor({ state: 'visible' });

    // Take screenshot of navigation result
    const aboutPageScreenshot = await expectScreenshot(page, 'navigation-about-page');
    assert.ok(aboutPageScreenshot, 'Should have about page screenshot');
  });

  it('should handle back/forward navigation correctly', async () => {
    const page = getPage();
    await page.goto(getBaseUrl());

    // Navigate to about page
    await page.getByRole('link', { name: /about/i }).click();
    await wait(300);

    // Go back
    await page.goBack();
    await wait(300);

    // Verify we're back on homepage
    const homeUrl = page.url();
    assert.ok(homeUrl.endsWith('/') || homeUrl.endsWith('/index.html'),
      `URL should be homepage (was ${homeUrl})`);

    // Go forward
    await page.goForward();
    await wait(300);

    // Verify we're back on about page
    const aboutUrl = page.url();
    assert.ok(aboutUrl.includes('about'), `URL should include 'about' (was ${aboutUrl})`);
  });

  it('should handle responsive navigation menus', async () => {
    const page = getPage();

    // Test on desktop viewport first
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(getBaseUrl());

    // Check navigation visibility on desktop
    const desktopNav = page.getByRole('navigation');
    await desktopNav.waitFor({ state: 'visible' });

    // Now test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await wait(500);

    // On mobile, there might be a hamburger menu
    // First check if the main nav is hidden or visible
    const isMobileNavVisible = await page.getByRole('navigation')
      .isVisible()
      .catch(() => {return false});

    if (!isMobileNavVisible) {
      // Look for a hamburger menu button
      const menuButton = page.getByRole('button', { name: /(menu|navigation)/i });
      const hasMenuButton = await menuButton.isVisible().catch(() => {return false});

      if (hasMenuButton) {
        // Click the menu button to open navigation
        await menuButton.click();
        await wait(300);

        // Now the navigation should be visible
        const mobileNav = page.getByRole('navigation');
        await mobileNav.waitFor({ state: 'visible' });

        // Take screenshot of open mobile navigation
        const mobileNavScreenshot = await expectScreenshot(page, 'navigation-mobile-open');
        assert.ok(mobileNavScreenshot, 'Should have mobile navigation screenshot');
      }
    } else {
      // The navigation is already visible on mobile
      const mobileNavScreenshot = await expectScreenshot(page, 'navigation-mobile-visible');
      assert.ok(mobileNavScreenshot, 'Should have mobile navigation screenshot');
    }
  });
});
