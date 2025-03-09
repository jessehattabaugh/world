/**
 * Shader Loader Utility
 *
 * This utility handles loading, preprocessing and compiling WebGPU shaders
 */

/**
 * Load a shader from a URL
 * @param {string} url - URL of the shader file
 * @returns {Promise<string>} - The shader source code
 */
export async function loadShader(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load shader: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Shader loading error:', error);
    throw error;
  }
}

/**
 * Preprocess a shader by including files and replacing preprocessor directives
 * @param {string} source - Source code of the shader
 * @param {Object} defines - Defines to replace in the shader
 * @returns {Promise<string>} - The preprocessed shader source
 */
export async function preprocessShader(source, defines = {}) {
  // Replace #define directives
  let processedSource = source;

  // Replace #define values
  for (const [key, value] of Object.entries(defines)) {
    const regex = new RegExp(`#define\\s+${key}\\s+[^\\n]*`, 'g');
    const replacement = `#define ${key} ${value}`;

    if (processedSource.match(regex)) {
      processedSource = processedSource.replace(regex, replacement);
    } else {
      // Add the define if it doesn't exist
      processedSource = `#define ${key} ${value}\n${processedSource}`;
    }
  }

  return processedSource;
}

/**
 * Create a shader module from source code
 * @param {GPUDevice} device - The WebGPU device
 * @param {string} source - Source code of the shader
 * @param {string} label - Label for the shader module
 * @returns {GPUShaderModule} - The compiled shader module
 */
export function createShaderModule(device, source, label = 'Unnamed Shader') {
  // Create the shader module
  const shaderModule = device.createShaderModule({
    label,
    code: source,
  });

  return shaderModule;
}

/**
 * Load, preprocess and compile a shader
 * @param {GPUDevice} device - The WebGPU device
 * @param {string} url - URL of the shader file
 * @param {Object} defines - Defines to replace in the shader
 * @param {string} label - Label for the shader module
 * @returns {Promise<GPUShaderModule>} - The compiled shader module
 */
export async function loadAndCompileShader(device, url, defines = {}, label = '') {
  // Extract the name from the URL if no label is provided
  if (!label) {
    const parts = url.split('/');
    label = parts[parts.length - 1].split('.')[0];
  }

  // Load and preprocess the shader
  const source = await loadShader(url);
  const processedSource = await preprocessShader(source, defines);

  // Create the shader module
  return createShaderModule(device, processedSource, label);
}