# Visual Regression Testing

This directory contains baseline screenshots for the project's visual regression tests.

## Related Documentation

- **[Main Project Documentation](../README.md)** - Overview of the entire project
- **[Testing Documentation](../tests/README.md)** - Comprehensive guide to testing strategy and implementation
- **[Performance Baselines Documentation](../performance/README.md)** - Details on performance testing and baselines
- **[Component Documentation](../www/components/README.md)** - Documentation for web components

## What Are Visual Snapshots?

Visual snapshots are reference screenshots of UI components and pages that are used to detect unintended visual changes. When tests run:

1. New screenshots are taken of the current UI state
2. These screenshots are compared to the baseline images stored in this directory
3. Tests fail if there are significant visual differences, indicating potential regressions

## Snapshot Organization

- All snapshots are stored with a flat structure in this directory
- Files follow the naming convention `component-state-baseline.png`
- Only baseline snapshots are committed to the repository
- Temporary files (diffs and actual screenshots) are generated during test runs but not committed

## Managing Snapshots

### Updating Snapshots

After intentional UI changes, update the visual baselines:

```bash
# Update all snapshots
npm run test:update-snapshots

# Update specific test snapshots
npm run test:update -- -u path/to/test.js
```

### Reviewing Visual Changes

When tests fail due to visual differences:

1. Check the Playwright report for side-by-side comparison
2. Examine the diff images to understand what changed
3. Determine if changes were intentional or represent bugs
4. Update baselines if changes were intentional

### Cleaning Temporary Files

To remove diff and actual screenshots (but preserve baselines):

```bash
npm run test:clean-snapshots
```

## Visual Testing Best Practices

1. **Focused snapshots:** Take screenshots of specific UI elements rather than entire pages
2. **Stable content:** Avoid snapshots of dynamic content that changes frequently
3. **Cross-platform awareness:** Be aware that fonts and rendering can vary across operating systems
4. **Viewport consistency:** Always specify viewport size when taking screenshots
5. **Theme consideration:** Test components in both light and dark themes
6. **Reduced motion:** Consider testing with reduced motion preferences enabled

For implementation details and code examples of visual tests, see the [Testing Documentation](../tests/README.md).
