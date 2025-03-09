# Performance Baselines

This directory contains performance baseline metrics for the application.

## Related Documentation

-   **[Main Project Documentation](../README.md)** - Overview of the entire project
-   **[Visual Testing Documentation](../snapshots/README.md)** - Information about visual regression testing
-   **[Web Components Documentation](../www/components/README.md)** - Documentation for web components including testing
-   **[Testing Documentation](../tests/README.md)** - Comprehensive guide to testing strategy and implementation
-   **[Performance Utilities](../tests/utils/performance-utils.js)** - Performance testing utility functions

## How Performance Testing Works

1. **Baseline Collection**: During development, performance metrics are collected and stored as baselines
2. **Automated Comparison**: Tests compare current performance against these baselines
3. **Regression Prevention**: If performance degrades beyond thresholds, tests will fail
4. **Documentation**: Changes in performance are logged for analysis

## Performance Files Organization

-   Each component or page has its own JSON file with metrics
-   Files are named according to what they test (e.g., `homepage-performance.json`, `theme-toggle-performance.json`)
-   Each file contains a timestamp and metrics object

## Core Web Vital Metrics Tracked

-   **FCP (First Contentful Paint)**: Time until the first content appears (target: < 2s)
-   **LCP (Largest Contentful Paint)**: Time until the main content appears (target: < 2.5s)
-   **CLS (Cumulative Layout Shift)**: Visual stability measure (target: < 0.1)
-   **TTI (Time to Interactive)**: Time until the page becomes interactive (target: < 3.5s)
-   **TBT (Total Blocking Time)**: Time the main thread is blocked (target: < 200ms)

## Component-Specific Metrics

Each component tracks metrics relevant to its functionality:

-   **Operation Time**: How long interactions take to complete (e.g., toggle actions)
-   **Memory Usage**: JS heap size and allocation metrics where applicable
-   **DOM Changes**: Number of DOM operations caused by component

## Lighthouse Integration

For main pages, full Lighthouse audits are performed and tracked:

-   Performance score (target: ≥ 90)
-   Accessibility score (target: ≥ 90)
-   Best Practices score (target: ≥ 90)
-   SEO score (target: ≥ 90)
-   PWA score (for reference)

## Managing Performance Baselines

### Performance Testing Philosophy

Our performance testing strategy is built on these key principles:

1. **Performance Matters:** We treat performance as a critical feature, not an afterthought
2. **Prevent Regressions:** Tests compare current performance against established baselines
3. **Historical Tracking:** We maintain performance history to ensure we're getting faster, not slower
4. **Intentional Acceptance:** Performance regressions are only accepted when necessary and justified

### Baseline Management Scripts

```bash
# Accept the most recent test results as the new performance baseline (use with caution)
npm run accept-perf

# Accept both performance and visual baseline changes at once
npm run accept-all

# Automatically update baselines during test runs
npm run updperf
```

### Comparing Performance Against Baselines

To generate reports showing how current performance compares to the baseline:

```bash
npm run compare-perf
```

This generates delta files in the format `performance/deltas/{page-name}.tmp.delta.json` with contents like:

```json
{
  "timestamp": "2023-05-15T14:30:00Z",
  "deltas": {
    "FCP": {
      "value": -120,
      "percentage": "-12%",
      "improvement": true
    },
    "LCP": {
      "value": 85,
      "percentage": "+8.5%",
      "improvement": false
    },
    "CLS": {
      "value": -0.02,
      "percentage": "-20%",
      "improvement": true
    }
  },
  "summary": {
    "improved": 2,
    "regressed": 1,
    "unchanged": 0,
    "overall": "improved"
  }
}
```

For visualizing these changes over time, you can run:

```bash
npm run diff-report
```

This generates an HTML report showing both performance trends and visual differences in a single dashboard.

### When to Accept Performance Regressions

While our goal is to continuously improve performance, we recognize that feature additions sometimes unavoidably impact performance metrics. Performance baseline acceptance should follow these guidelines:

1. **Prioritize optimization first:** Before accepting a regression, attempt to optimize the implementation
2. **Document the justification:** Always document why the performance regression is being accepted
3. **Quantify the impact:** Understand exactly how much performance is degrading
4. **Seek team consensus:** Performance regressions should be approved by the team
5. **Set improvement goals:** When accepting a regression, set goals for future optimization

### Using the Baseline Acceptance Scripts

```bash
# Run your tests to capture current performance
npm run test

# If only performance regression needs to be accepted:
npm run accept-perf

# If both visual and performance changes need to be accepted:
npm run accept-all

# IMPORTANT: Include a detailed commit message explaining:
# - Which metrics changed and by how much
# - Why the regression was necessary
# - Any future optimization plans
```

These scripts should be used sparingly. Their purpose is to acknowledge the reality that performance requirements may increase as features are added, while maintaining our commitment to monitoring and improving performance over time.

To update baselines after intentional performance changes:

```bash
npm run test:update-performance
```

This will run tests with the UPDATE_PERFORMANCE_BASELINE flag and save current metrics as the new baselines.

## Adding Performance Tests for New Components

1. Import the performance utility functions:

```javascript
import {
	getBrowserPerformanceMetrics,
	assertPerformanceBaseline,
} from './utils/performance-utils.js';
```

2. Create a test that measures relevant metrics:

```javascript
test('component meets performance baseline', async ({ page }) => {
	await page.goto('/your-component-page');

	// Get performance metrics
	const metrics = await getBrowserPerformanceMetrics(page);

	// Compare against baseline
	await assertPerformanceBaseline('your-component-name', metrics);

	// Optional: Assert specific thresholds
	expect(metrics.operationTime).toBeLessThan(500);
});
```

3. Run the test and a baseline will be automatically created
