# Testing Documentation

This directory contains end-to-end tests for the web boilerplate project.

## Mission

To ensure our web application works correctly for all users by testing in real browsers. Our tests verify functionality, accessibility, visual consistency, and performance to deliver a high-quality user experience across different devices and assistive technologies.

## Rules

- We test in real browsers, not with mocks or simulations
- We use accessibility-friendly selectors (getByRole, getByLabel) rather than data-* attributes
- Tests should access the page as a user or screenreader would
- We write tests before implementing features (TDD)
- Every PR requires passing tests before merging
- We test across multiple browsers and devices
- We include visual regression tests for all UI components
- We monitor performance metrics against established baselines
- We verify accessibility requirements in our tests
- We test complete user journeys, not just isolated components
- Console messages in tests follow the project standard format
- Tests must be independent and able to run in isolation
- Tests must be deterministic - they should pass consistently without flakiness
- We use emojis in test assertions to make them more descriptive and easier to scan

## Related Documentation

- **[Main Project Documentation](../README.md)** - Overview of the entire project
- **[Visual Testing Documentation](../snapshots/README.md)** - Information about visual regression testing
- **[Performance Baselines Documentation](../performance/README.md)** - Details on performance testing and baselines
- **[Component Documentation](../www/components/README.md)** - Documentation for web components

## Testing Philosophy

This project embraces a practical testing philosophy:

1. **Production is the ultimate test** - Real users on real devices are the true validation
2. **Automated browser testing** against staging environments is the next best thing
3. **Local browser testing** during development provides immediate feedback

We deliberately avoid "mock-heavy" unit or integration tests that test abstractions rather than real user experiences.

## Test Organization

The tests in this directory are organized as follows:

- **`*.test.js`** - Test files for different features and components
- **`utils/`** - Utility functions for testing, including performance testing helpers
- **`fixtures/`** - Test data and fixtures (if applicable)

### Main Test Files

- **`index.test.js`** - Tests for the homepage
- **`theme-toggle.test.js`** - Tests for the theme toggle component
- **`example.test.js`** - Example tests demonstrating best practices
- **`performance.test.js`** - Core web vitals and performance tests

## Running Tests

The project includes several test scripts:

```bash
# Run all tests
npm run test

# Run tests with UI for debugging
npm run test:ui

# Run tests against staging environment
npm run test:staging

# Update visual snapshots after intentional UI changes
npm run test:update-snapshots

# Update performance baselines after optimizations
npm run test:update-performance

# Run just the theme toggle tests
npx playwright test theme-toggle.test.js
```

## Test Types

### Functional Tests

Functional tests verify that features work as expected from a user's perspective. These tests simulate real user interactions like clicking, typing, and navigating.

Example from `example.test.js`:

```javascript
test('new visitor can navigate the site', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ message: '🔍 Heading should be visible on homepage' });
  await page.getByRole('link', { name: /about/i }).click();
  await expect(page).toHaveURL(/.*about/, { message: '🧭 URL should contain "about" after navigation' });
});
```

### Visual Regression Tests

Visual tests ensure UI components maintain their expected appearance. When UI changes are intentional, update the snapshots:

```bash
npm run test:update-snapshots
```

Example from `theme-toggle.test.js`:

```javascript
await expect(themeToggle).toHaveScreenshot('theme-toggle-before-click-baseline.png', { message: '📸 Theme toggle should match baseline before click' });
await themeToggle.click();
await page.waitForTimeout(300);
await expect(themeToggle).toHaveScreenshot('theme-toggle-after-click-baseline.png', { message: '📸 Theme toggle should match baseline after click' });
```

### Performance Tests

Performance tests monitor core web vitals and prevent regressions:

- Core Web Vitals (FCP, LCP, CLS)
- Interaction metrics (TTI, TBT)
- Component-specific performance

Example using performance utilities:

```javascript
const metrics = await getBrowserPerformanceMetrics(page);
await assertPerformanceBaseline('homepage', metrics);
expect(metrics.FCP).toBeLessThan(2000, { message: '⚡ First Contentful Paint should be under 2s' });
```

## Writing Effective Tests

When adding new features, write tests that:

1. Focus on **user journeys** rather than implementation details
2. Use **accessibility-friendly selectors** like `getByRole` and `getByLabel`
3. Test across **multiple browsers and devices**
4. Include **visual regression** and **performance** tests
5. Verify **accessibility** requirements are met
6. Use **emojis** in assertions to make them more descriptive

### Best Practices

- Use role-based selectors: `page.getByRole('button', { name: 'Submit' })`
- Test responsive behavior: `page.setViewportSize({ width: 375, height: 667 })`
- Test for accessibility: `page.keyboard.press('Tab')` to verify keyboard navigation
- Focus on user flows: Simulate complete journeys like registration or checkout
- Keep tests independent: Each test should run in isolation
- Add descriptive emojis: Use relevant emojis in test assertions for better readability

## Common Emoji Usage in Tests

Here's our standardized emoji usage for different test types:

- 📱 Mobile testing
- 🖥️ Desktop testing
- 🌓 Theme testing (dark/light)
- 📸 Visual regression tests
- ⚡ Performance tests
- ♿ Accessibility tests
- 🧭 Navigation tests
- 🖱️ Mouse interaction tests
- ⌨️ Keyboard interaction tests
- 🔍 Visibility checks
- 💾 Data persistence tests
- 🌐 Network tests
- 🔒 Security tests

## Performance Testing System

The performance testing system works as follows:

1. During tests, metrics are collected using `getBrowserPerformanceMetrics()`
2. These metrics are compared against baselines using `assertPerformanceBaseline()`
3. If metrics degrade beyond thresholds, tests will fail
4. Baselines are stored in the `/performance` directory

To update performance baselines after intentional changes:

```bash
npm run test:update-performance
```

For more details on performance testing, see the [Performance Baselines Documentation](../performance/README.md).

## Visual Testing System

The visual testing system works as follows:

1. Screenshots are taken during tests using `toHaveScreenshot()`
2. These screenshots are compared against baselines stored in `/snapshots`
3. If visual differences are detected, tests will fail
4. Diffs are generated to show what changed

To update visual baselines after intentional UI changes:

```bash
npm run test:update-snapshots
```

For more details on visual testing, see the [Visual Testing Documentation](../snapshots/README.md).

## Test Reliability and Passing Criteria

To ensure tests pass consistently:

1. **Deterministic assertions** - Tests should have clear pass/fail criteria with appropriate timeouts
2. **Stable selectors** - Use stable selectors that won't break with minor UI changes
3. **Isolated test environments** - Each test should run independently without state interference
4. **Proper setup/teardown** - Tests should clean up after themselves
5. **Appropriate waiting** - Use proper waiting techniques instead of arbitrary timeouts

### Common Causes of Test Failures

- **Timing issues** - Use `waitFor` functions instead of fixed timeouts
- **Environmental differences** - Test in environments that match production closely
- **Selector brittleness** - Prefer role-based and accessible selectors
- **Resource constraints** - Ensure test environments have adequate resources
- **API inconsistencies** - Mock external APIs when necessary for consistency

### Debugging Failed Tests

When tests fail:

1. Check the test logs and screenshots in the `test-results/` directory
2. Run the specific failing test in UI mode: `npm run test:ui -- -g "test name"`
3. Verify if the failure is consistent or intermittent
4. Check if the failure occurs in only specific environments
5. Review recent code changes that might have affected the test

## Common Test Failures and Solutions

### Element Not Found Timeouts

If you encounter timeouts like:
```
Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
```

Try these solutions:

1. **Check element existence**: Verify the element actually exists in your app in the current state
2. **Increase timeout**: For slow-loading elements, increase the timeout:
   ```javascript
   await expect(element).toBeVisible({ timeout: 10000, message: '🔍 Element should become visible' });
   ```
3. **Use networkidle**: Wait for network to be idle before assertions:
   ```javascript
   await page.goto('/', { waitUntil: 'networkidle' });
   ```
4. **Add debugging**: Log page content to see what's actually available:
   ```javascript
   console.log(await page.content());
   ```
5. **Use alternative selectors**: If the preferred selector isn't working, try alternatives

### Theme Toggle Element Not Found

When encountering errors with the theme toggle test:

```
Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
Locator: getByRole('switch', { name: /toggle theme/i })
```

The theme toggle implementation may vary across projects. Try these solutions:

1. **Check the actual implementation**:
   - Use the browser inspector to determine the correct role and name
   - Verify if it's using `role="switch"` or if it's a button or other element

2. **Use multiple selector strategies**:
   ```javascript
   // Try different selectors in sequence
   const toggle = await findToggleElement(page);

   async function findToggleElement(page) {
     // Try by role
     try {
       const toggle = page.getByRole('switch', { name: /theme/i });
       if (await toggle.isVisible().catch(() => false)) return toggle;
     } catch (e) {}

     // Try by button with theme-related name
     try {
       const button = page.getByRole('button', { name: /(theme|dark|light)/i });
       if (await button.isVisible().catch(() => false)) return button;
     } catch (e) {}

     // Try common selectors
     const selectors = ['#theme-toggle', '.theme-toggle', '[data-testid="theme-toggle"]'];
     for (const selector of selectors) {
       const el = page.locator(selector);
       if (await el.isVisible().catch(() => false)) return el;
     }

     return null;
   }
   ```

3. **Debug the actual implementation**:
   ```javascript
   // Output HTML to see what's really there
   console.log(await page.content());

   // List all interactive elements
   const buttons = await page.locator('button, [role="button"], [role="switch"]').all();
   for (const btn of buttons) {
     console.log(await btn.textContent(), await btn.getAttribute('aria-label'));
   }
   ```
