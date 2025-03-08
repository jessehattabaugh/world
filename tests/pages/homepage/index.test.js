import { test } from '@playwright/test';
import { runAccessibilityTests } from '../../utils/accessibility-utils.js';
import { runPerformanceTests } from '../../utils/performance-utils.js';
import { runVisualTests } from '../../utils/visual-utils.js';
import { runSecurityTests } from '../../utils/security-utils.js';
import { navigateWithFallback } from '../../utils/navigation-utils';

const pageUrl = '/';  // This will now be relative to baseURL
const pageName = 'Homepage';
const pageId = 'homepage';

test.describe('Homepage', () => {
  test('runs all tests', async ({ page, baseURL }) => {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    // This test orchestrates all the individual test types
    test.info().annotations.push({ type: 'page', description: pageName });

    // Run all test types in sequence
    await runAccessibilityTests(page, pageId);
    await runPerformanceTests(page, pageId);
    await runVisualTests(page, pageId);
    await runSecurityTests(page, pageId);
  });
});
