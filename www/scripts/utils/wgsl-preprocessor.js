/**
 * WGSL Shader Preprocessor
 *
 * This utility provides advanced preprocessing for WGSL shaders,
 * including file includes, macro expansion, and conditional compilation.
 */

/**
 * Process #include directives in WGSL shader code
 * @param {string} source - Original shader source code
 * @param {function} fetchInclude - Function to fetch included file content
 * @param {Set<string>} [included] - Set of already included files to prevent circular includes
 * @returns {Promise<string>} - Processed shader with includes resolved
 */
export async function processIncludes(source, fetchInclude, included = new Set()) {
  const includeRegex = /^\s*#include\s+["<]([^">]+)[">]\s*$/gm;
  let result = source;
  let match;

  // Reset regex state
  includeRegex.lastIndex = 0;

  while ((match = includeRegex.exec(source)) !== null) {
    const includePath = match[1];

    // Prevent circular includes
    if (included.has(includePath)) {
      console.warn(`Circular include detected: ${includePath}`);
      result = result.replace(match[0], `// Circular include skipped: ${includePath}`);
      continue;
    }

    try {
      // Mark this path as included
      included.add(includePath);

      // Fetch the include content
      let includeContent = await fetchInclude(includePath);

      // Process nested includes recursively
      includeContent = await processIncludes(includeContent, fetchInclude, included);

      // Replace the #include directive with the content
      result = result.replace(match[0], `// Included from: ${includePath}\n${includeContent}`);
    } catch (error) {
      console.error(`Failed to process include ${includePath}:`, error);
      // Replace with error comment
      result = result.replace(match[0], `// ERROR including ${includePath}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Replace #define macros in WGSL shader code
 * @param {string} source - Shader source code
 * @param {Object} defines - Mapping of define names to values
 * @returns {string} - Processed shader with defines replaced
 */
export function processMacros(source, defines = {}) {
  let result = source;

  // First, process #define directives in the source
  const defineRegex = /^\s*#define\s+([A-Za-z_]\w*)\s+(.*)$/gm;
  const sourceDefines = {};
  let match;

  while ((match = defineRegex.exec(source)) !== null) {
    const name = match[1];
    const value = match[2].trim();
    sourceDefines[name] = value;
  }

  // Merge with provided defines, with provided defines taking precedence
  const allDefines = { ...sourceDefines, ...defines };

  // Replace use of macros in the code
  for (const [name, value] of Object.entries(allDefines)) {
    // Replace the macro usage, being careful with word boundaries
    const macroRegex = new RegExp(`\\b${name}\\b`, 'g');
    result = result.replace(macroRegex, value);
  }

  return result;
}

/**
 * Process #if/#ifdef/#else/#endif directives for conditional compilation
 * @param {string} source - Shader source code
 * @param {Object} defines - Mapping of define names to boolean values
 * @returns {string} - Processed shader with conditional sections applied
 */
export function processConditionals(source, defines = {}) {
  const lines = source.split('\n');
  const result = [];
  const stack = [];
  let currentlyIncluding = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for conditional directives
    if (line.trim().startsWith('#ifdef ')) {
      // #ifdef MACRO - check if the macro is defined
      const macro = line.trim().substring(7).trim();
      stack.push(currentlyIncluding);
      currentlyIncluding = currentlyIncluding && (macro in defines);
      continue;
    }

    if (line.trim().startsWith('#ifndef ')) {
      // #ifndef MACRO - check if the macro is NOT defined
      const macro = line.trim().substring(8).trim();
      stack.push(currentlyIncluding);
      currentlyIncluding = currentlyIncluding && !(macro in defines);
      continue;
    }

    if (line.trim().startsWith('#if ')) {
      // #if EXPRESSION - evaluate the expression
      const expression = line.trim().substring(4).trim();
      stack.push(currentlyIncluding);
      // Simple evaluation for now - just check if the expression is a defined macro
      currentlyIncluding = currentlyIncluding && evaluateExpression(expression, defines);
      continue;
    }

    if (line.trim() === '#else') {
      // #else - toggle the current inclusion state
      if (stack.length === 0) {
        throw new Error('Unexpected #else without matching #if/#ifdef/#ifndef');
      }
      currentlyIncluding = stack[stack.length - 1] && !currentlyIncluding;
      continue;
    }

    if (line.trim() === '#endif') {
      // #endif - restore the previous inclusion state
      if (stack.length === 0) {
        throw new Error('Unexpected #endif without matching #if/#ifdef/#ifndef');
      }
      currentlyIncluding = stack.pop();
      continue;
    }

    // Include the line if we're in an inclusion section
    if (currentlyIncluding) {
      result.push(line);
    }
  }

  // Check for unclosed conditionals
  if (stack.length > 0) {
    throw new Error('Unclosed conditional directives');
  }

  return result.join('\n');
}

/**
 * Evaluate a simple expression for #if directive
 * @param {string} expression - The expression to evaluate
 * @param {Object} defines - Mapping of define names to values
 * @returns {boolean} - Whether the expression evaluates to true
 */
function evaluateExpression(expression, defines) {
  // Handle defined() operator
  const definedRegex = /defined\s*\(\s*([A-Za-z_]\w*)\s*\)/g;
  expression = expression.replace(definedRegex, (match, name) => {
    return name in defines ? '1' : '0';
  });

  // Replace macros with their values
  for (const [name, value] of Object.entries(defines)) {
    const macroRegex = new RegExp(`\\b${name}\\b`, 'g');
    expression = expression.replace(macroRegex, value);
  }

  // For now, we'll implement a very simple evaluator
  try {
    // Only allow specific safe operations
    if (/[^01 &|!=<>()+-/*]/.test(expression)) {
      console.warn(`Unsafe expression in #if directive: ${expression}`);
      return false;
    }

    // Evaluate the expression (carefully)
    return !!Function(`'use strict'; return (${expression});`)();
  } catch (error) {
    console.error(`Failed to evaluate #if expression: ${expression}`, error);
    return false;
  }
}

/**
 * Preprocess a WGSL shader with all preprocessing features
 * @param {string} source - Original shader source
 * @param {Object} options - Preprocessing options
 * @param {Object} options.defines - Macro definitions
 * @param {function} options.fetchInclude - Function to fetch included files
 * @returns {Promise<string>} - Fully preprocessed shader
 */
export async function preprocessShader(source, options = {}) {
  const { defines = {}, fetchInclude } = options;

  // Process includes if a fetchInclude function is provided
  let result = source;
  if (typeof fetchInclude === 'function') {
    result = await processIncludes(result, fetchInclude);
  }

  // Process conditional compilation
  result = processConditionals(result, defines);

  // Process macro replacements
  result = processMacros(result, defines);

  return result;
}