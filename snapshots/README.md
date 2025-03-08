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

## Types of Visual Tests

This project includes several types of visual tests:

1. **Component tests** - Screenshots of individual UI components
2. **Page tests** - Full-page screenshots on different viewports
3. **State tests** - Components in different states (e.g., before/after click)
4. **Theme tests** - Components in light and dark modes
5. **Responsive tests** - Components at different viewport sizes

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

1. **Focused snapshots:** When possible, take screenshots of specific UI elements rather than entire pages
2. **Stable content:** Avoid taking snapshots of dynamic content that changes frequently
3. **Cross-platform awareness:** Be aware that fonts and rendering can vary slightly across operating systems
4. **Viewport consistency:** Always specify viewport size when taking screenshots
5. **Theme consideration:** Test components in both light and dark themes
6. **Reduced motion:** Consider testing with reduced motion preferences enabled

## Example Visual Test

From `theme-toggle.test.js`:

```javascript
test('toggle functionality changes theme', async ({ page }) => {
  await page.goto('/');

  // Find the theme toggle
  const themeToggle = page.getByRole('switch', { name: /toggle theme/i });

  // Take screenshot before clicking
  await expect(themeToggle).toHaveScreenshot('theme-toggle-before-click-baseline.png');

  // Click toggle and take another screenshot
  await themeToggle.click();
  await page.waitForTimeout(300); // Wait for animations
  await expect(themeToggle).toHaveScreenshot('theme-toggle-after-click-baseline.png');
});
```

## Snapshot Threshold Configuration

The project configures snapshot comparison thresholds in the Playwright config file:

- **maxDiffPixels:** Maximum number of pixels that can be different
- **maxDiffPixelRatio:** Maximum ratio of different pixels
- **threshold:** Pixel-by-pixel comparison threshold (0-1)

These settings are carefully tuned to avoid false positives while catching meaningful changes.

## Visual Testing Workflow

1. **Development phase:** Make UI changes and run tests
2. **Visual changes detected:** Tests will fail if UI changed
3. **Review changes:** Check the Playwright report for before/after comparison
4. **Update if intentional:** Run tests with update flag if changes were intended
5. **Fix if bugs:** Adjust code if changes were not intended
6. **Commit:** When tests pass, commit both code and updated snapshots

By following these guidelines, the project maintains visual consistency across changes and prevents unintended visual regressions.
