# Integrated Testing Framework

This document outlines our comprehensive testing framework that covers accessibility, performance, visual regression, security, and functional testing - all derived automatically from the sitemap.

## System Requirements

- **Linux Operating System**: The testing framework is designed to run exclusively on Linux
- **Node.js**: v16 or higher
- **Bash Shell**: Required for environment variable syntax in npm scripts

> **Note**: This framework does not support Windows environments. For development on Windows machines, consider using WSL (Windows Subsystem for Linux).

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

### Test Command Workflows

The npm scripts are organized into common workflows for different testing scenarios:

#### Quick Development Cycle
1. Start the dev server: `npm run dev`
2. Run focused tests: `npm run test:e2e` or `npm run test:unit`
3. If issues occur: `npm run test:debug` or `npm run test:ui`

#### Visual Testing Workflow
1. Make UI changes
2. Generate new screenshots: `npm run shots`
3. Compare changes: `npm run visual:compare`
4. If changes are intentional: `npm run shots:accept`

#### Performance Testing Workflow
1. Run benchmarks: `npm run perf:benchmark`
2. Monitor metrics: `npm run perf:monitor`
3. Analyze results: `npm run perf:analyze`
4. If changes are accepted: `npm run test:perf`

#### Full Testing Suite
1. Clean temporary files: `npm run clean`
2. Check code style: `npm run lint`
3. Run all tests: `npm run test:all`
4. View report: `npm run report`

### Test Command Organization

The npm scripts are organized into logical groups based on frequency of use and purpose:

#### Common Testing Commands
```bash
npm test         # Run all tests (alias for test:all)
npm run test:ui  # Open test UI for interactive debugging
npm run test:debug # Run tests with debugger attached
```

#### Core Test Categories
```bash
npm run test:unit    # Run unit tests
npm run test:e2e     # Run end-to-end tests
npm run test:visual  # Run visual tests
npm run test:perf    # Run performance tests
npm run test:all     # Run all test categories
```

#### Visual Testing Workflow
```bash
# Generate new screenshots
npm run shots

# Compare current state against baselines
npm run visual:compare

# Accept new screenshots as baseline
npm run shots:accept

# Do everything in one command
npm run visual
```

#### Performance Testing Workflow
```bash
# Run performance tests
npm run test:perf

# Run comprehensive performance analysis
npm run perf

# Update performance baselines
npm run perf:accept
```

#### Running Tests in Different Environments
```bash
npm run local    # Test against local dev server
npm run staging  # Test against staging environment
npm run prod     # Test against production
npm run ci       # Run CI test suite
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
- `npm run accept-perf` - Accept the most recent performance test results as the new baseline

### Performance Baseline Management Philosophy

Our approach to performance testing follows these principles:

1. **Performance should never degrade:** By default, we track baselines to ensure performance is maintained or improved
2. **Baseline flexibility when needed:** We acknowledge that adding features sometimes impacts performance metrics
3. **Intentional acceptance:** Performance regressions should only be accepted when necessary and justified
4. **Documentation:** When accepting new baselines, document the reason for the change

#### When to Accept Performance Regressions

Only accept performance regressions when:

- A new required feature unavoidably impacts performance
- The performance impact is understood and minimized
- The team agrees the tradeoff is worthwhile
- The regression has been documented

To accept a new performance baseline:

```bash
npm run accept-perf
```

This will set the most recent test run's performance metrics as the new baseline. Always include a commit message explaining why the regression was accepted.

## Visual Testing

Visual tests automatically capture screenshots at different viewport sizes and compare them with baselines.

### Visual Testing Scripts

- `npm run shots` - Generate screenshots for all pages
- `npm run updshots` - Update visual baselines (when UI intentionally changes)

## Visual and Performance Baseline Management

Our testing framework tracks both visual appearance and performance metrics using baselines that are checked into git. We maintain a consistent workflow for accepting changes to either type of baseline.

### Baseline Management Scripts

```bash
# Accept new performance baselines
npm run accept-perf

# Accept new visual snapshots
npm run accept-shots   # (alias for updshots)

# Accept both performance and visual baseline changes at once
npm run accept-all
```

### Baseline Comparison Scripts

```bash
# Compare current performance against baselines and generate delta reports
npm run compare-perf

# Generate visual diff images showing pixel changes from baseline
npm run compare-shots

# Run both comparison scripts in parallel
npm run compare-all

# Generate a comprehensive diff report with both performance and visual changes
npm run diff-report
```

The comparison scripts generate temporary files (using the *.tmp.* pattern) that show exactly what has changed:

- **Visual diffs**: Located in `/snapshots/diffs/*.tmp.diff.png` - Red pixels show removed content, green shows added content
- **Performance deltas**: Located in `/performance/deltas/*.tmp.delta.json` - Shows metrics increases/decreases with percentage changes

These temporary comparison files are excluded from git via the `.gitignore` file.

### When to Accept New Baselines

- **Performance Baselines:** When feature additions unavoidably impact performance metrics
- **Visual Baselines:** When intentional UI changes affect the appearance of components
- **Both Together:** When significant changes affect both appearance and performance

After accepting new baselines, always include a detailed commit message explaining the changes and their justification.

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
npm run accept-shots
```

### Performance Tests Failing

Verify if the performance regression is expected. If the changes are intentional, update the baseline:

```bash
npm run accept-perf
```

### Both Visual and Performance Tests Failing

If you've made changes that affect both appearance and performance:

```bash
npm run accept-all
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
