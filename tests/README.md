# Testing Documentation

This document provides information about the available testing commands in this project.

## Available Commands

### Core Testing Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run the default test suite in staging environment |
| `npm run b-local🧪` | Run tests in local environment |
| `npm run b-staging🧪` | Run tests in staging environment |
| `npm run b-prod🧪` | Run tests in production environment (Chromium only) |
| `npm run c-quick🚄` | Run a quick test suite (clean snapshots, lint, local tests, and show report) |
| `npm run c-full🏁` | Run all tests across environments with performance tests |

### Test Utilities

| Command | Description |
|---------|-------------|
| `npm run d-clean🧹` | Clean existing snapshots |
| `npm run e-report📋` | Show the Playwright test report |
| `npm run d-debug🐛` | Run tests in debug mode |
| `npm run d-ui👀` | Run tests with Playwright UI mode |
| `npm run z-run🏃` | Execute test runner script with CI detection |

### Visual & Performance Testing

| Command | Description |
|---------|-------------|
| `npm run g-shots📸` | Generate screenshots (using BASE_URL) |
| `npm run g-updshots🔄` | Update test snapshots |
| `npm run f-perf⚡` | Run performance update script |
| `npm run f-updperf📊` | Update performance baseline |
| `npm run analyze` | Run Lighthouse analysis and generate HTML report |
| `npm run audit` | Run Lighthouse CI to test against performance thresholds |

### Special Usage

| Command | Description |
|---------|-------------|
| `npm run b-url🌐` | Run tests against a specific URL (set via TEST_URL env var) |
| `npm run z-codegen🧩` | Generate Playwright test code using codegen tool |
| `npm lint` | Run ESLint on the project |

## Examples

```bash
# Run a quick test cycle during development
npm run c-quick🚄

# Debug tests interactively
npm run d-debug🐛

# Update visual snapshots after intentional UI changes
npm run g-updshots🔄

# Run full test suite for CI environments
npm run c-full🏁

# Run tests against a specific deployment
TEST_URL=https://staging-example.com npm run b-url🌐

# Run a Lighthouse audit and fail if thresholds aren't met
npm run audit

# Generate a Lighthouse report without enforcing thresholds
npm run analyze
```

## Performance Thresholds

The `npm run audit` command will validate the following thresholds:
- Performance score: 80% or higher
- Accessibility score: 90% or higher
- Best Practices score: 90% or higher
- SEO score: 90% or higher
- First Contentful Paint: 2000ms or less
- Time to Interactive: 3500ms or less
- Largest Contentful Paint: 2500ms or less

These thresholds can be adjusted in the `lighthouserc.js` file.

Note: The `pretest` script will automatically create necessary directories before testing.
