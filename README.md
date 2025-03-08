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
- `npm run start:https` - Start with HTTPS for testing secure features
- `npm run build` - Build for production (optimizes CSS)
- `npm run lint` - Run ESLint for code quality checks
- `npm run test` - Run Playwright end-to-end tests
- `npm run test:ui` - Run Playwright tests with UI for debugging
- `npm run analyze` - Analyze the site with Lighthouse
