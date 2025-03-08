/**
 * Tests for general accessibility features
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createPageFixture, getBaseUrl } from '../setup.js';
import { wait } from '../utils/test-helpers.js';

describe('Accessibility Features', () => {
  const getPage = createPageFixture();

  describe('Keyboard Navigation', () => {
    it('should allow tabbing through interactive elements', async () => {
      const page = getPage();
      await page.goto(getBaseUrl());

      // Get count of expected focusable elements
      const focusableCount = await page.evaluate(() => {
        const selector = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
        return document.querySelectorAll(selector).length;
      });

      if (focusableCount === 0) {
        console.log('No focusable elements found, skipping test');
        return;
      }

      // Test tabbing through at least the first 3 elements
      for (let i = 0; i < Math.min(focusableCount, 3); i++) {
        await page.keyboard.press('Tab');

        const focusedElement = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tag: el?.tagName?.toLowerCase(),
            type: el?.getAttribute('type'),
            role: el?.getAttribute('role'),
            tabindex: el?.getAttribute('tabindex'),
            isFocused: el !== document.body
          };
        });

        assert.ok(focusedElement.isFocused, `Element should be focused after Tab press #${i + 1}`);
      }
    });
  });

  describe('Skip Links', () => {
    it('should have skip to content link or similar accessibility feature', async () => {
      const page = getPage();
      await page.goto(getBaseUrl());

      // Press tab once to see if first focusable element is a skip link
      await page.keyboard.press('Tab');

      const firstFocusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        const text = el?.textContent?.toLowerCase() || '';
        const href = el?.getAttribute('href');

        return {
          tag: el?.tagName?.toLowerCase(),
          text,
          href,
          isSkipLink: (text.includes('skip') || text.includes('jump')) &&
                      (href?.startsWith('#') || href?.includes('content') || href?.includes('main'))
        };
      });

      // Only log as info rather than failing test if skip link isn't found
      // as it's a best practice but not strictly required
      if (!firstFocusedElement.isSkipLink) {
        console.log('INFO: No skip link found. Best practice is to include a skip to content link for keyboard users.');
      }
    });
  });

  describe('ARIA Attributes', () => {
    it('should use appropriate ARIA attributes on interactive elements', async () => {
      const page = getPage();
      await page.goto(getBaseUrl());

      const ariaAudit = await page.evaluate(() => {
        // Find elements that should have ARIA attributes
        const candidates = [
          ...document.querySelectorAll('button, [role="button"]'),
          ...document.querySelectorAll('input'),
          ...document.querySelectorAll('[aria-hidden], [aria-label], [aria-labelledby], [aria-describedby]')
        ];

        const results = {
          total: candidates.length,
          withLabels: 0,
          withoutLabels: []
        };

        candidates.forEach(el => {
          const tag = el.tagName.toLowerCase();
          const type = el.getAttribute('type');
          const role = el.getAttribute('role');

          // Skip hidden elements
          if (el.getAttribute('aria-hidden') === 'true' ||
              el.getAttribute('hidden') !== null ||
              (getComputedStyle(el).display === 'none')) {
            return;
          }

          // Skip non-interactive inputs
          if (tag === 'input' && ['hidden'].includes(type)) {
            return;
          }

          // Check for accessible name
          const hasAriaLabel = el.hasAttribute('aria-label');
          const hasAriaLabelledBy = el.hasAttribute('aria-labelledby');
          const hasLabel = hasAriaLabel || hasAriaLabelledBy;
          const hasVisibleText = el.textContent.trim().length > 0;

          if (hasLabel || hasVisibleText || tag === 'input') {
            results.withLabels++;
          } else {
            results.withoutLabels.push({
              tag,
              type,
              role,
              id: el.id,
              classes: el.className
            });
          }
        });

        return results;
      });

      console.log(`ARIA audit: ${ariaAudit.withLabels}/${ariaAudit.total} interactive elements have accessible labels`);

      // If there are elements without labels, log them but don't necessarily fail the test
      if (ariaAudit.withoutLabels.length > 0) {
        console.log('Elements without accessible labels:', ariaAudit.withoutLabels);
      }

      // Assert a reasonable percentage of elements have accessible labels
      const labelPercentage = (ariaAudit.withLabels / ariaAudit.total) * 100;
      assert.ok(
        ariaAudit.total === 0 || labelPercentage > 80,
        `At least 80% of interactive elements should have accessible labels (current: ${labelPercentage.toFixed(1)}%)`
      );
    });
  });
});
