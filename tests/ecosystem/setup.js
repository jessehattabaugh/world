/**
 * Test setup for ecosystem tests
 *
 * This file helps manage imports and mocks for the ecosystem test suite
 */

// Mock fetch for shader includes in tests
global.fetch = async (url) => {
  // Return a mock response for shader files if requested
  if (url.includes('/scripts/shaders/')) {
    return {
      ok: true,
      async text() {
        return '// Mock shader content for tests';
      }
    };
  }

  // Return a 404 for other URLs
  return {
    ok: false,
    status: 404,
    statusText: 'Not Found'
  };
};

// Expose a utility to create mock WebGPU device for testing
global.createMockWebGPUDevice = () => {
  return {
    createBuffer: () => {return {
      destroy: () => {},
      label: 'Mock buffer'
    }},
    createShaderModule: () => {return {
      label: 'Mock shader module'
    }},
    createPipeline: async () => {return {
      label: 'Mock pipeline'
    }},
    queue: {
      writeBuffer: () => {}
    },
    addEventListener: () => {},
    destroy: () => {}
  };
};

export default {};