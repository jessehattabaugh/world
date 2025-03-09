import { test } from '@playwright/test';
import { runAccessibilityTests } from '../../utils/accessibility-utils.js';
import { runPerformanceTests } from '../../utils/performance-utils.js';
import { runVisualTests } from '../../utils/visual-utils.js';
import { runSecurityTests } from '../../utils/security-utils.js';

const pageUrl = '/about';
const pageName = 'About';
const pageId = 'about';

test.describe('About', () => {
  test('runs all tests', async ({ page }) => {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    test.info().annotations.push({ type: 'page', description: pageName });

    await runAccessibilityTests(page, pageId);
    await runPerformanceTests(page, pageId);
    await runVisualTests(page, pageId);
    await runSecurityTests(page, pageId);
  });
});
