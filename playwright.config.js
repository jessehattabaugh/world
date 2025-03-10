import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [
		['html', { open: 'never' }],
		['list', { printSteps: true }],
	],

	// Updated to include ecosystem tests
	testMatch: ['**/tests/pages/**/*.test.js', '**/tests/ecosystem/**/*.test.js'],

	// Configure the flat snapshot directory
	snapshotDir: './snapshots',

	// Configure expectations
	expect: {
		// Configure screenshot comparison
		toHaveScreenshot: {
			maxDiffPixelRatio: 0.05,
			// Use a naming convention that includes "baseline" for base snapshots
			snapshotPathTemplate: '{snapshotDir}/{arg}{ext}',
		},
	},

	// Dev server configuration
	webServer: {
		command: 'npm run dev',
		port: 3000,
		timeout: 120000,
		reuseExistingServer: !process.env.CI,
		cwd: process.cwd(),
	},

	use: {
		baseURL: 'http://localhost:3000',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
	},

	// Configure projects for Chrome only since it's the only browser with WebGPU support
	projects: [
		{
			name: 'chromium',
			use: {
				browserName: 'chromium',
				viewport: { width: 1280, height: 720 },
				// Chrome with WebGPU enabled
				launchOptions: {
					args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPU'],
				},
			},
		},
	],
});
