/**
 * Homepage page tests
 */
import { test } from '@playwright/test';
import { runAccessibilityTests } from '../../utils/accessibility-utils.js';
import { runPerformanceTests } from '../../utils/performance-utils.js';
import { runVisualTests } from '../../utils/visual-utils.js';
import { runSecurityTests } from '../../utils/security-utils.js';

const pageUrl = 'https://jessesworld.example.com/';
const pageName = 'Homepage';
const pageId = 'https:--jessesworld.example.com';

test.describe('Homepage', () => {
  test('runs all tests', async ({ page }) => {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    // This test orchestrates all the individual test types
    // Each test module handles its own reporting and assertions
    test.info().annotations.push({ type: 'page', description: pageName });

    // Run all test types in sequence
    await runAccessibilityTests(page, pageId);
    await runPerformanceTests(page, pageId);
    await runVisualTests(page, pageId);
    await runSecurityTests(page, pageId);
  });
});
