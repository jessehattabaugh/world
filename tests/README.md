# Testing Documentation

This directory contains end-to-end tests for the web boilerplate project. Our testing strategy focuses on real browser testing to ensure the best user experience.

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
npm run test:theme
```

## Test Types

### Functional Tests

Functional tests verify that features work as expected from a user's perspective. These tests simulate real user interactions like clicking, typing, and navigating.

Example from `example.test.js`:

```javascript
test('new visitor can navigate the site', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('link', { name: /about/i }).click();
  await expect(page).toHaveURL(/.*about/);
});
```

### Visual Regression Tests

Visual tests ensure UI components maintain their expected appearance. When UI changes are intentional, update the snapshots:

```bash
npm run test:update-snapshots
```

Example from `theme-toggle.test.js`:

```javascript
await expect(themeToggle).toHaveScreenshot('theme-toggle-before-click-baseline.png');
await themeToggle.click();
await page.waitForTimeout(300);
await expect(themeToggle).toHaveScreenshot('theme-toggle-after-click-baseline.png');
```

### Accessibility Tests

These tests ensure the site works for all users:

- Keyboard navigation testing
- Screen reader compatibility
- WCAG compliance checks

Example:

```javascript
test('toggle is keyboard accessible', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  // Check if toggle is focused...
  await page.keyboard.press('Enter');
  // Verify the toggle was activated...
});
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
expect(metrics.FCP).toBeLessThan(2000); // First Contentful Paint under 2s
```

## Writing Effective Tests

When adding new features, write tests that:

1. Focus on **user journeys** rather than implementation details
2. Use **accessibility-friendly selectors** like `getByRole` and `getByLabel`
3. Test across **multiple browsers and devices**
4. Include **visual regression** and **performance** tests
5. Verify **accessibility** requirements are met

### Best Practices

- Use role-based selectors: `page.getByRole('button', { name: 'Submit' })`
- Test responsive behavior: `page.setViewportSize({ width: 375, height: 667 })`
- Test for accessibility: `page.keyboard.press('Tab')` to verify keyboard navigation
- Focus on user flows: Simulate complete journeys like registration or checkout
- Keep tests independent: Each test should run in isolation

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
