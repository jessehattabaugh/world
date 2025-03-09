# Integrated Testing Framework

This document outlines our comprehensive testing framework that covers accessibility, performance, visual regression, security, and functional testing - all derived automatically from the sitemap.

## Overview

Our testing framework automatically generates test scaffolds for each page in the application by reading the sitemap.xml file. Each page has tests for:

- **Accessibility**: WCAG compliance and keyboard navigation
- **Performance**: Core Web Vitals and performance metrics
- **Visual Testing**: Screenshots for desktop and mobile
- **Security**: Headers, CSP, and vulnerable libraries
- **Functional**: User journeys and interactions

## Getting Started

### Prerequisites

- Node.js (v16+)
- Playwright installed (`npm install -g playwright`)

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific environments
npm run local     # Local environment
npm run staging   # Staging environment
npm run prod      # Production environment
npm run url       # Custom URL (set TEST_URL env variable)

# Run just a quick test suite
npm run quick
```

## Page and Test Generation

### Creating a New Page

To create a new page and have tests automatically generated:

```bash
# Basic syntax
npm run new:page [path] [optional-title]

# Example: Create an About page
npm run new:page /about "About Us"

# Example: Create a nested page
npm run new:page /products/featured "Featured Products"
```

This will:
1. Create the HTML page in the correct location
2. Add the page to sitemap.xml
3. Generate test scaffolds automatically

### Regenerating Test Scaffolds

If you've updated your sitemap.xml or want to refresh all test scaffolds:

```bash
npm run generate:tests
```

## Test Structure

Each page's tests are organized in the `/tests/pages/[page-id]/` directory with files:

- `index.test.js` - Main test orchestrator
- `accessibility.test.js` - A11y tests
- `performance.test.js` - Performance tests
- `visual.test.js` - Visual regression tests
- `security.test.js` - Security tests

## Performance Testing

Performance testing is fully integrated into the testing framework rather than being a separate concern. Each page automatically:

1. Captures Core Web Vitals (LCP, FCP, CLS, etc.)
2. Compares against established baselines
3. Flags regressions beyond acceptable thresholds
4. Visualizes performance trends over time

### Performance Scripts

- `npm run perf` - Update performance baselines for all pages in sitemap
- `npm run updperf` - Update performance baselines during test runs (uses current metrics as new baseline)
- `npm run analyze` - Generate Lighthouse reports for performance analysis

## Visual Testing

Visual tests automatically capture screenshots at different viewport sizes and compare them with baselines.

### Visual Testing Scripts

- `npm run shots` - Generate screenshots for all pages
- `npm run updshots` - Update visual baselines (when UI intentionally changes)

## Accessibility Testing

Accessibility tests use axe-core to validate WCAG compliance and test keyboard navigation patterns.

## Security Testing

Security tests check:
- Proper HTTP security headers
- Content Security Policy configuration
- Detection of known vulnerable libraries

## Configuration

You can configure testing behavior in:

- `playwright.config.js` - Playwright configuration
- `.env` files - Environment-specific variables

## Continuous Integration

The testing framework is designed to run in CI environments. Set the `CI=true` environment variable to adjust behavior for CI.

```bash
# Run in CI mode
CI=true npm test
```

## Utility Files

- `tests/utils/accessibility-utils.js` - A11y testing utilities
- `tests/utils/performance-utils.js` - Performance testing utilities
- `tests/utils/visual-utils.js` - Visual testing utilities
- `tests/utils/security-utils.js` - Security testing utilities

## Best Practices

1. **Keep Tests Independent**: Each test should function independently
2. **Avoid Flaky Tests**: Ensure tests are deterministic and reliable
3. **Use Page Objects**: Extract page-specific logic to page object files
4. **Test Real User Flows**: Tests should mimic actual user behavior
5. **Monitor Performance Trends**: Watch for performance regressions over time

## Troubleshooting

### Visual Snapshots Failing

Check if the UI was intentionally changed. If so, update baselines:

```bash
npm run updshots
```

### Performance Tests Failing

Verify if the performance regression is expected. If the changes are intentional, update the baseline:

```bash
npm run updperf
```

### Debugging Tests

```bash
npm run debug  # Start tests in debug mode
npm run ui     # Start tests in UI mode
```

# Testing Documentation

## Test Structure

```
tests/
├── pages/          # Page-specific tests
├── utils/          # Test utilities
│   ├── accessibility-utils.js  # A11y testing helpers
│   ├── performance-utils.js    # Performance testing helpers
│   ├── visual-utils.js        # Visual testing helpers
│   └── security-utils.js      # Security testing helpers
└── README.md       # This file
```

## Test Types

### Accessibility Tests
- WCAG 2.1 AA compliance using axe-core
- Keyboard navigation verification
- Focus management testing

### Performance Tests
- Core Web Vitals
- Custom performance metrics
- Resource loading optimization

### Visual Tests
- Cross-browser screenshot comparison
- Responsive design verification
- Theme switching tests

### Security Tests
- Content security policy verification
- Sensitive data exposure checks
- Security headers validation

## Configuration

Tests can be configured via:
- `playwright.config.js` - Main test configuration
- Environment variables:
  - `TEST_ENV`: test environment (local/staging/prod)
  - `BASE_URL`: custom test URL
  - `CI`: CI environment detection
