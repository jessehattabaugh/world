// @ts-check
import { expect, test } from '@playwright/test';
import { processConditionals, processIncludes, processMacros } from '../../www/scripts/utils/wgsl-preprocessor.js';

/**
 * Tests for the WGSL Shader Preprocessor
 * These tests validate the shader preprocessor functionality for Milestone 1
 */

test.describe('WGSL Shader Preprocessor', () => {
  // Test macro processing
  test('should process simple macros correctly', async () => {
    const source = `
      #define MAX_ENTITIES 1000

      fn main() {
        if (index >= MAX_ENTITIES) {
          return;
        }
      }
    `;

    const processed = processMacros(source);

    expect(processed).toContain('if (index >= 1000)');
  });

  test('should override macros with provided values', async () => {
    const source = `
      #define MAX_ENTITIES 1000

      fn main() {
        if (index >= MAX_ENTITIES) {
          return;
        }
      }
    `;

    const processed = processMacros(source, { MAX_ENTITIES: '2000' });

    expect(processed).toContain('if (index >= 2000)');
  });

  // Test conditional processing
  test('should process simple conditionals correctly', () => {
    const source = `
      #ifdef FEATURE_A
      fn featureA() {
        // Feature A code
      }
      #endif

      #ifndef FEATURE_B
      fn fallbackB() {
        // Fallback code
      }
      #endif
    `;

    // When FEATURE_A is defined, FEATURE_B is not
    let processed = processConditionals(source, { FEATURE_A: '1' });
    expect(processed).toContain('fn featureA()');
    expect(processed).toContain('fn fallbackB()');

    // When FEATURE_B is defined, FEATURE_A is not
    processed = processConditionals(source, { FEATURE_B: '1' });
    expect(processed).not.toContain('fn featureA()');
    expect(processed).not.toContain('fn fallbackB()');
  });

  test('should process conditionals with else correctly', () => {
    const source = `
      #ifdef ADVANCED_RENDERING
      fn renderAdvanced() {
        // Advanced rendering
      }
      #else
      fn renderBasic() {
        // Basic rendering
      }
      #endif
    `;

    // When ADVANCED_RENDERING is defined
    let processed = processConditionals(source, { ADVANCED_RENDERING: '1' });
    expect(processed).toContain('fn renderAdvanced()');
    expect(processed).not.toContain('fn renderBasic()');

    // When ADVANCED_RENDERING is not defined
    processed = processConditionals(source, {});
    expect(processed).not.toContain('fn renderAdvanced()');
    expect(processed).toContain('fn renderBasic()');
  });

  // Test include processing
  test('should process includes correctly', async () => {
    const source = `
      #include "common/math.wgsl"

      fn main() {
        let dir = angleToDir(1.0);
      }
    `;

    // Mock fetch function for includes
    const fetchInclude = async (path) => {
      if (path === 'common/math.wgsl') {
        return `
          fn angleToDir(angle: f32) -> vec2f {
            return vec2f(cos(angle), sin(angle));
          }
        `;
      }
      throw new Error(`Include not found: ${path}`);
    };

    const processed = await processIncludes(source, fetchInclude);

    expect(processed).toContain('// Included from: common/math.wgsl');
    expect(processed).toContain('fn angleToDir(angle: f32)');
  });

  test('should handle circular includes', async () => {
    const source = `
      #include "a.wgsl"

      fn main() {
        doSomething();
      }
    `;

    // Mock fetch function with circular includes
    const fetchInclude = async (path) => {
      if (path === 'a.wgsl') {
        return `
          #include "b.wgsl"

          fn a() {}
        `;
      }
      if (path === 'b.wgsl') {
        return `
          #include "a.wgsl"

          fn b() {}
        `;
      }
      throw new Error(`Include not found: ${path}`);
    };

    const processed = await processIncludes(source, fetchInclude);

    expect(processed).toContain('// Included from: a.wgsl');
    expect(processed).toContain('fn a() {}');
    expect(processed).toContain('fn b() {}');
    expect(processed).toContain('Circular include skipped');
  });
});