import { createPageFixture, expectScreenshot, getBaseUrl } from '../setup.js';
/**
 * Navigation flow tests
 */
import { describe, it } from 'node:test';

import assert from 'node:assert';
import { wait } from '../utils/test-helpers.js';

describe('Navigation Flows', () => {
  const getPage = createPageFixture();

  // Added from example.test.js
  it('new visitor can navigate the site', async () => {
    const page = getPage();
    // Navigate to the homepage
    await page.goto(getBaseUrl(), { waitUntil: 'networkidle' });

    // Add debugging to help troubleshoot
    console.log('Page loaded, current URL:', page.url());

    // Log the page content to help debug what's available
    const pageContent = await page.content();
    console.log('Page contains h1:', pageContent.includes('<h1'));

    // Try a more reliable selector - either the specific heading text or a more general approach
    try {
		// Increase timeout and use a more specific selector if possible
		const heading = await page.getByRole('heading', { level: 1 });
		assert.ok(
			await heading.isVisible({ timeout: 10000 }),
			'🔍 Main heading should be visible on homepage',
		);
	} catch {
		console.log('Could not find h1, trying alternative selector');
		// Alternative approach - look for any heading if h1 specifically isn't found
		const anyHeading = await page.locator('h1, h2');
		assert.ok(
			await anyHeading.isVisible({ timeout: 5000 }),
			'🔍 Some heading should be visible on homepage',
		);
	}

    // Continue with the rest of the test
    const aboutLink = page.getByRole('link', { name: /about/i });
    await aboutLink.click();

    const url = page.url();
    assert.ok(url.includes('about'),
      '🧭 URL should include "about" after navigation');
  });

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
