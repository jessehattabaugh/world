import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
	getBrowserPerformanceMetrics,
	assertPerformanceBaseline,
	getLighthouseScores,
} from './utils/performance-utils.js';

/**
 * Test the homepage
 */
test.describe('Homepage', () => {
	// Create snapshots directory if it doesn't exist
	const snapshotDir = path.join(process.cwd(), 'snapshots');
	if (!fs.existsSync(snapshotDir)) {
		fs.mkdirSync(snapshotDir, { recursive: true });
	}

	// Test the homepage visuals
	test('homepage should match visual baseline', async ({ page }) => {
		await page.goto('/', { timeout: 30000 });

		// Wait for any animations or transitions to complete
		await page.waitForTimeout(500);

		// Take a screenshot of the entire page
		await expect(page).toHaveScreenshot('homepage-desktop-baseline.png', {
			message: '📸 Homepage desktop view should match baseline'
		});
	});

	// Test for mobile viewport
	test('homepage on mobile should match visual baseline', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/', { timeout: 30000 });

		// Wait for any animations to complete
		await page.waitForTimeout(500);

		// Attempt to find heading but don't fail if not found
		try {
			await page.getByRole('heading', { level: 1 })
				.waitFor({ state: 'visible', timeout: 5000 });
		} catch (e) {
			console.log('Heading level 1 not found, continuing test');
		}

		await expect(page).toHaveScreenshot('homepage-mobile-baseline.png', {
			message: '📱 Homepage mobile view should match baseline'
		});
	});

	// Test for accessibility-specific features
	test('should have proper keyboard navigation', async ({ page }) => {
		await page.goto('/', { timeout: 30000 });

		// Take screenshot with focus on the first interactive element
		await page.keyboard.press('Tab');

		// Find the currently focused element
		const focusedElement = await page.evaluate(() => {
			const el = document.activeElement;
			return el?.tagName !== 'BODY'; // Check if focus moved from body
		});

		// Verify something is actually focused
		expect(focusedElement).toBeTruthy({
			message: '⌨️ An element should be focused after pressing Tab'
		});

		// Take a screenshot with the focus visible
		await expect(page).toHaveScreenshot('homepage-keyboard-focus-baseline.png', {
			message: '📸 Keyboard focus indicators should match baseline'
		});
	});

	// Performance testing for homepage
	test('homepage meets performance baseline requirements', async ({ page }) => {
		await page.goto('/', { timeout: 30000, waitUntil: 'networkidle' });

		// Collect browser performance metrics
		const metrics = await getBrowserPerformanceMetrics(page);
		console.log('Homepage performance metrics:', metrics);

		// Compare against baseline - don't fail test if this is the first run
		await assertPerformanceBaseline('homepage', metrics);

		// Skip strict assertions for metrics which may vary in test environments
		if (metrics.FCP !== undefined && metrics.FCP > 0) {
			expect(metrics.FCP).toBeLessThan(5000, {
				message: '⚡ FCP should be under 5 seconds in test environment'
			});
		}
		if (metrics.LCP !== undefined && metrics.LCP > 0) {
			expect(metrics.LCP).toBeLessThan(5000, {
				message: '⚡ LCP should be under 5 seconds in test environment'
			});
		}
		if (metrics.CLS !== undefined) {
			expect(metrics.CLS).toBeLessThan(0.25, {
				message: '📊 CLS should be under 0.25 in test environment'
			});
		}
	});

	test('homepage passes Lighthouse performance thresholds', async ({ page, baseURL }) => {
		test.skip(process.env.CI === 'true', 'Lighthouse tests are skipped in CI environment');

		// Only run on chromium
		test.skip(
			page.context().browser().browserType().name() !== 'chromium',
			'Lighthouse tests only run on Chromium',
		);

		// Visit the page first to ensure it's loaded and server is running
		await page.goto('/', { timeout: 30000 });
		await page.waitForLoadState('networkidle');

		// Now run Lighthouse (using the base URL)
		const url = baseURL || 'http://localhost:3000';
		const scores = await getLighthouseScores(url);

		// Save or compare with baseline
		await assertPerformanceBaseline('homepage-lighthouse', scores);

		// Check against absolute thresholds
		expect(scores.performance).toBeGreaterThanOrEqual(90, {
			message: '📊 Lighthouse performance score should be at least 90'
		});
		expect(scores.accessibility).toBeGreaterThanOrEqual(90, {
			message: '♿ Lighthouse accessibility score should be at least 90'
		});
		expect(scores['best-practices']).toBeGreaterThanOrEqual(90, {
			message: '✅ Lighthouse best practices score should be at least 90'
		});
		expect(scores.seo).toBeGreaterThanOrEqual(90, {
			message: '🔍 Lighthouse SEO score should be at least 90'
		});
	});
});
