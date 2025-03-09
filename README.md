# Web Boilerplate

A modern web boilerplate with cutting-edge features

## Mission

To build a web site that is tested end-to-end in real browsers, authored in web standards, and supportive of assistive technologies. We embrace modern JavaScript and CSS features while rejecting compilation steps and unnecessary abstractions.

## Rules

- We use HTML, JavaScript, CSS, JSDoc comments, and JSON
- We reject compiled languages like JSX, TypeScript, SCSS, YML
- We adhere to test driven development practices; each PR should have tests added first, then a commit where tests pass
- We only rebase, no merges
- We use Web Components whenever there are DOM interactions, and DOM interactions are ONLY done in Web Components
- We use visual regression testing to capture snapshots of components during critical user journeys
- We avoid dependencies, and when needed import them from CDNs
- We reject CJS and use ES Modules exclusively
- We build with modern JavaScript and CSS features; users are expected to upgrade their browsers
- Tests must pass before code can be merged
- We make code debuggable by inserting console messages at important points:
  - `console.debug`: Information that can be ignored
  - `console.info`: Nice-to-have but not crucial information
  - `console.log`: Messages we want the user to see (not errors)
  - `console.warn`: Warnings that need user attention
  - `console.error`: Critical errors that prevent the app from proceeding
- Console messages follow the format: `[shared emoji] message [unique emoji] functionName`
- Tests use accessible selectors (no data-* attributes) to access elements as a user or screenreader would
- We use ARIA roles for better accessibility

## Features

- 🎨 Modern CSS with variables, reset, and utility classes
- 🚀 View Transitions API for smooth page transitions
- 🔄 Service Worker with workbox for offline support
- 🌓 Dark/light theme support with auto detection
- 🤖 Simple bot protection for forms
- 📱 Fully responsive with container queries
- 🔒 Enhanced security headers
- ♿ Accessibility features including prefers-reduced-motion support
- 🔍 SEO optimized

## Project Documentation

- **[Testing Documentation](./tests/README.md)** - Testing strategy and implementation
- **[Visual Testing Documentation](./snapshots/README.md)** - Visual regression testing
- **[Performance Documentation](./performance/README.md)** - Performance testing and baselines
- **[Components Documentation](./www/components/README.md)** - Web components

## Getting Started

1. Install dependencies by running `npm install`
2. Configure your site: `npm run configure` (or manually edit the `public/config.js` file)
3. Start the development server with `npm start`

### Development Scripts

- `npm start` - Start the development server
- `npm run lint` - Run ESLint for code quality checks
- `npm run fix` - Run ESLint and fix issues automatically
- `npm test` - Run Playwright end-to-end tests
- `npm run local` - Run tests against local environment
- `npm run staging` - Run tests against staging environment
- `npm run prod` - Run tests against production environment
- `npm run debug` - Run tests in debug mode
- `npm run ui` - Run tests with Playwright UI
- `npm run report` - Show test reports
- `npm run quick` - Run a quick test suite

## Snapshot Management

### Regenerating Baseline Snapshots

The project includes a utility script to regenerate snapshot baselines:

```bash
npm run updshots
```

This script runs the tests with `--update-snapshots` flag to update visual test baselines.

## Website Testing Framework

A comprehensive testing framework that unifies accessibility, performance, visual, security, and functional testing.

## Features

- **Integrated Testing**: All testing types in a unified framework
- **Sitemap-Based**: Automatically generates tests from your sitemap.xml
- **Page Generator**: Create new pages with tests pre-configured
- **Comprehensive Coverage**: Tests accessibility, performance, visuals, security, and functionality

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run all tests
npm test

# Create a new page
npm run new:page /page-path "Page Title"

# Generate/update test scaffolds from sitemap
npm run generate:tests
```

## Testing Framework

Our testing approach treats performance as an intrinsic part of UI acceptance testing rather than a separate concern. Tests are automatically generated from your sitemap.xml, ensuring consistent coverage across your site.

For detailed information on the testing framework, see [Tests Documentation](./tests/README.md).

## Key Scripts

- `npm start` - Start local development server
- `npm test` - Run all tests
- `npm run local` - Run tests against local environment
- `npm run staging` - Run tests against staging environment
- `npm run prod` - Run tests against production environment
- `npm run new:page` - Create a new page with test scaffolds
- `npm run generate:tests` - Generate test scaffolds from sitemap
- `npm run perf` - Update performance data for all pages from sitemap
- `npm run updperf` - Update performance baselines during tests
- `npm run shots` - Generate screenshots for all pages
- `npm run updshots` - Update visual snapshots during tests
- `npm run analyze` - Run Lighthouse analysis
- `npm run audit` - Run full site audit with Lighthouse

## Directory Structure

```
/
├── bin/                # CLI tools and utilities
│   ├── generate-page.js        # Page generator
│   ├── generate-test-scaffold.js   # Test scaffold generator
│   └── perf-update.js         # Performance baseline updater
├── performance/        # Performance baselines
├── snapshots/          # Visual test baselines
├── tests/              # Test files
│   ├── pages/          # Page-specific tests
│   └── utils/          # Test utilities
├── www/                # Website source files
│   └── sitemap.xml     # Site structure used for test generation
└── package.json        # Project configuration
```

## Documentation

- [Tests Documentation](./tests/README.md)
- [Performance Documentation](./performance/README.md)

## Performance Testing

Performance is tested as part of our standard test suite. Key metrics tracked:

- **Core Web Vitals**: LCP, FCP, CLS
- **Navigation Timing**: TTFB, DOM Content Loaded, Load
- **Memory Usage**: JS Heap Size and utilization
- **Custom Metrics**: Script execution time, resource counts

## Integration with CI/CD

Configure your CI/CD pipeline to run tests on each build:

```yaml
# Example GitHub Actions workflow
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run tests
        run: npm test
      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: playwright-report/
          retention-days: 30
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
