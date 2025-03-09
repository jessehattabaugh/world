/**
 * Accessibility testing utilities
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

/**
 * Inject axe-core library into the page
 * @param {Page} page Playwright page object
 */
export async function injectAxe(page) {
  // Use CDN version of axe-core for simplicity
  await page.evaluate(() => {
    if (!document.querySelector('#axe-core-script')) {
      const script = document.createElement('script');
      script.id = 'axe-core-script';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js';
      document.head.appendChild(script);

      return new Promise((resolve) => {
        script.onload = resolve;
      });
    }
  });

  // Wait for axe to be available
  await page.waitForFunction(() => {return window.axe});
}

/**
 * Run axe accessibility tests on the page
 * @param {Page} page Playwright page object
 * @param {Object} options Options for axe.run
 * @returns {Array} Accessibility violations
 */
export async function checkA11y(page, options = {}) {
  const axeOptions = {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    },
    ...options,
  };

  const violations = await page.evaluate((opts) => {
    return new Promise((resolve) => {
      window.axe.run(document, opts).then((results) => {
        resolve(results.violations);
      });
    });
  }, axeOptions);

  return violations;
}

/**
 * Run all accessibility tests for a page
 * @param {Page} page Playwright page object
 * @param {string} pageId Page identifier
 */
export async function runAccessibilityTests(page, pageId) {
  console.log(`♿ Running accessibility tests for ${pageId}...`);

  // Inject axe if needed
  await injectAxe(page);

  // Run axe accessibility tests
  const violations = await checkA11y(page);

  // Check for keyboard accessibility
  const keyboardAccessible = await checkKeyboardAccessibility(page);

  // Save violations to file for reporting
  const accessibilityDir = path.join(rootDir, 'reports', 'accessibility');

  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(accessibilityDir)) {
      fs.mkdirSync(accessibilityDir, { recursive: true });
    }

    // Save violations
    const reportPath = path.join(accessibilityDir, `${pageId}-a11y.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      violations,
      keyboardAccessible,
    }, null, 2));

  } catch (error) {
    console.error('Error saving accessibility report:', error);
  }

  // Log violations
  if (violations.length > 0) {
    console.warn(`⚠️ ${violations.length} accessibility violations found for ${pageId}:`);
    violations.forEach((violation, i) => {
      console.warn(`  ${i+1}. ${violation.id}: ${violation.description} (impact: ${violation.impact})`);
      console.warn(`     Help: ${violation.help}`);
      console.warn(`     Elements affected: ${violation.nodes.length}`);
    });
  } else {
    console.log(`✅ No accessibility violations found for ${pageId}`);
  }

  if (!keyboardAccessible.isAccessible) {
    console.warn(`⚠️ Keyboard accessibility issues found for ${pageId}:`);
    console.warn(`  - ${keyboardAccessible.reason}`);
  } else {
    console.log(`✅ Keyboard accessibility verified for ${pageId}`);
  }

  return { violations, keyboardAccessible };
}

/**
 * Check keyboard accessibility
 * @param {Page} page Playwright page object
 * @returns {Object} Keyboard accessibility result
 */
async function checkKeyboardAccessibility(page) {
  // Tab through interactive elements
  await page.keyboard.press('Tab');

  // Check if focus is visible
  const focusedElement = await page.evaluate(() => {
    const el = document.activeElement;
    if (el?.tagName === 'BODY') {
      return { visible: false, element: 'BODY' };
    }

    // Get computed style to check if focus is visible
    const style = window.getComputedStyle(el);
    const outlineStyle = style.getPropertyValue('outline-style');
    const outlineWidth = style.getPropertyValue('outline-width');
    const outlineColor = style.getPropertyValue('outline-color');

    const hasFocusStyles =
      outlineStyle !== 'none' &&
      outlineWidth !== '0px' &&
      outlineColor !== 'transparent';

    return {
      visible: hasFocusStyles,
      element: el.tagName,
      id: el.id,
      classList: Array.from(el.classList)
    };
  });

  if (!focusedElement.visible) {
    return {
      isAccessible: false,
      reason: `Focus not visible after tabbing (focused element: ${focusedElement.element})`
    };
  }

  return { isAccessible: true };
}
