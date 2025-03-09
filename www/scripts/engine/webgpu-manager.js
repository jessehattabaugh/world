/**
 * WebGPU Manager
 *
 * This class manages WebGPU resources and provides helper methods for:
 * - Device initialization
 * - Buffer creation
 * - Pipeline setup
 * - Compute and render operations
 */

import { loadAndCompileShader } from '../utils/shader-loader.js';

export class WebGPUManager {
  /**
   * Create a new WebGPU manager
   */
  constructor() {
    this.adapter = null;
    this.device = null;
    this.initialized = false;
    this.features = {
      hasWebGPU: false,
      computeShaderSupported: false,
      storageBufferSupported: false
    };
    this.simulationPipeline = null;
    this.renderPipeline = null;

    // Separate pipelines for update and physics
    this.computePipeline = {
      update: null,
      physics: null,
      bindGroupLayout: null
    };
  }

  /**
   * Check if WebGPU is supported by the browser
   * @returns {boolean} - Whether WebGPU is supported
   */
  static isWebGPUSupported() {
    return 'gpu' in navigator;
  }

  /**
   * Initialize WebGPU
   * @param {Object} options - Initialization options
   * @param {string} options.powerPreference - Power preference, either 'high-performance' or 'low-power'
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize(options = { powerPreference: 'high-performance' }) {
    if (!WebGPUManager.isWebGPUSupported()) {
      console.warn('WebGPU is not supported in this browser');
      return false;
    }

    try {
      // Request adapter
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: options.powerPreference
      });

      if (!this.adapter) {
        console.error('Failed to get WebGPU adapter');
        return false;
      }

      // Get adapter info
      const adapterInfo = await this.adapter.requestAdapterInfo();
      console.debug('WebGPU Adapter:', adapterInfo);

      // Request device
      this.device = await this.adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {
          maxBufferSize: 256 * 1024 * 1024 // 256MB buffer size
        }
      });

      // Set error handler
      this.device.addEventListener('uncapturederror', (event) => {
        console.error('WebGPU device error:', event.error);
      });

      // Check feature support
      this.features.hasWebGPU = true;
      this.features.computeShaderSupported = true; // Compute is always supported in WebGPU
      this.features.storageBufferSupported = true; // Storage buffers are always supported in WebGPU

      this.initialized = true;
      console.debug('WebGPU initialized successfully');
      return true;
    } catch (error) {
      console.error('WebGPU initialization error:', error);
      return false;
    }
  }

  /**
   * Create a buffer
   * @param {Object} options - Buffer options
   * @param {ArrayBuffer|TypedArray} options.data - The data to upload (optional)
   * @param {number} options.size - Size of the buffer in bytes (required if data is not provided)
   * @param {GPUBufferUsageFlags} options.usage - Buffer usage flags
   * @param {string} options.label - Buffer label
   * @param {boolean} options.mappedAtCreation - Whether the buffer should be mapped at creation
   * @returns {GPUBuffer} - The created buffer
   */
  createBuffer(options) {
    if (!this.initialized) {
      throw new Error('WebGPU not initialized');
    }

    const bufferDescriptor = {
      label: options.label || 'Unnamed buffer',
      usage: options.usage,
      mappedAtCreation: options.mappedAtCreation || false
    };

    // Set size from data or explicit size
    if (options.data) {
      const {data} = options;
      bufferDescriptor.size = data.byteLength;

      // Create buffer
      const buffer = this.device.createBuffer(bufferDescriptor);

      // Upload data if provided
      if (!options.mappedAtCreation) {
        this.device.queue.writeBuffer(buffer, 0, data);
      } else {
        // If mapped at creation, write to the mapped range
        const mappedRange = new Uint8Array(buffer.getMappedRange());
        mappedRange.set(new Uint8Array(data.buffer || data));
        buffer.unmap();
      }

      return buffer;
    } else if (options.size) {
      bufferDescriptor.size = options.size;
      return this.device.createBuffer(bufferDescriptor);
    } else {
      throw new Error('Either data or size must be provided');
    }
  }

  /**
   * Load and compile shaders
   * @param {string} computeShaderUrl - URL of compute shader
   * @param {string} renderShaderUrl - URL of render shader
   * @param {Object} defines - Shader preprocessor defines
   * @returns {Promise<{computeShader: GPUShaderModule, renderShader: GPUShaderModule}>}
   */
  async loadShaders(computeShaderUrl, renderShaderUrl, defines = {}) {
    if (!this.initialized) {
      throw new Error('WebGPU not initialized');
    }

    const compShader = await loadAndCompileShader(
      this.device,
      computeShaderUrl,
      defines,
      'Compute Shader'
    );

    const rendShader = await loadAndCompileShader(
      this.device,
      renderShaderUrl,
      defines,
      'Render Shader'
    );

    return {
      computeShader: compShader,
      renderShader: rendShader
    };
  }

  /**
   * Create a compute pipeline
   * @param {GPUShaderModule} computeShader - The compute shader module
   * @param {string} entryPoint - The entry point function
   * @returns {Promise<GPUComputePipeline>} - The compute pipeline
   */
  async createComputePipeline(computeShader, entryPoint = 'main') {
    if (!this.initialized) {
      throw new Error('WebGPU not initialized');
    }

    // Create bind group layout first
    this.computePipeline.bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Simulation Pipeline Layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' }
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' }
        }
      ]
    });

    // Create pipeline layout using bind group layout
    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Simulation Pipeline Layout',
      bindGroupLayouts: [this.computePipeline.bindGroupLayout]
    });

    // Create update pipeline
    this.computePipeline.update = await this.device.createComputePipelineAsync({
      label: 'Entity Update Pipeline',
      layout: pipelineLayout,
      compute: {
        module: computeShader,
        entryPoint: 'update'
      }
    });

    // Create physics pipeline
    this.computePipeline.physics = await this.device.createComputePipelineAsync({
      label: 'Entity Physics Pipeline',
      layout: pipelineLayout,
      compute: {
        module: computeShader,
        entryPoint: 'physics'
      }
    });

    return this.computePipeline;
  }

  /**
   * Create a render pipeline
   * @param {GPUShaderModule} renderShader - The render shader module
   * @param {GPUCanvasContext} context - The canvas context
   * @param {Object} options - Render pipeline options
   * @returns {Promise<GPURenderPipeline>} - The render pipeline
   */
  async createRenderPipeline(renderShader, context, options = {}) {
    if (!this.initialized) {
      throw new Error('WebGPU not initialized');
    }

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    return await this.device.createRenderPipelineAsync({
      label: 'Render pipeline',
      layout: 'auto',
      vertex: {
        module: renderShader,
        entryPoint: 'vs_main',
        buffers: [
          {
            // Unit circle vertices (for instanced rendering)
            arrayStride: 8, // 2 floats (x, y) * 4 bytes
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: 'float32x2' // 2D position
              }
            ]
          }
        ]
      },
      fragment: {
        module: renderShader,
        entryPoint: 'fs_main',
        targets: [
          {
            format: presentationFormat,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
              }
            }
          }
        ]
      },
      primitive: {
        topology: 'triangle-list'
      },
      depthStencil: options.depthStencil
    });
  }

  /**
   * Create bind groups for simulation
   * @param {Object} buffers - Buffer objects to bind
   * @returns {GPUBindGroup} The bind group
   */
  createSimulationBindGroup(buffers) {
    if (!this.initialized || !this.simulationPipeline) {
      throw new Error('WebGPU or compute pipeline not initialized');
    }

    return this.device.createBindGroup({
      layout: this.simulationPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: buffers.input }
        },
        {
          binding: 1,
          resource: { buffer: buffers.output }
        },
        {
          binding: 2,
          resource: { buffer: buffers.params }
        },
        {
          binding: 3,
          resource: { buffer: buffers.neuralNets }
        }
      ]
    });
  }

  /**
   * Execute a compute pass
   * @param {GPUComputePipeline} pipeline - The compute pipeline
   * @param {Array<GPUBindGroup>} bindGroups - Array of bind groups to set
   * @param {Array<number>} workgroupCounts - Workgroup counts [x, y, z]
   */
  executeCompute(pipeline, bindGroups, workgroupCounts) {
    if (!this.initialized) {
      throw new Error('WebGPU not initialized');
    }

    const commandEncoder = this.device.createCommandEncoder({
      label: 'Compute command encoder',
    });

    const computePass = commandEncoder.beginComputePass({
      label: 'Compute pass'
    });

    computePass.setPipeline(pipeline);

    bindGroups.forEach((bindGroup, index) => {
      computePass.setBindGroup(index, bindGroup);
    });

    computePass.dispatchWorkgroups(
      workgroupCounts[0],
      workgroupCounts[1] || 1,
      workgroupCounts[2] || 1
    );

    computePass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Copy buffer to buffer
   * @param {GPUBuffer} src - Source buffer
   * @param {GPUBuffer} dst - Destination buffer
   * @param {number} size - Size to copy in bytes
   */
  copyBufferToBuffer(src, dst, size) {
    if (!this.initialized) {
      throw new Error('WebGPU not initialized');
    }

    const commandEncoder = this.device.createCommandEncoder({
      label: 'Copy command encoder',
    });

    commandEncoder.copyBufferToBuffer(src, 0, dst, 0, size);

    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Configure a canvas for WebGPU rendering
   * @param {HTMLCanvasElement} canvas - The canvas to configure
   * @returns {GPUCanvasContext} - The configured canvas context
   */
  configureCanvas(canvas) {
    if (!this.initialized) {
      throw new Error('WebGPU not initialized');
    }

    const context = canvas.getContext('webgpu');
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
      device: this.device,
      format: presentationFormat,
      alphaMode: 'premultiplied'
    });

    return context;
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.device) {
      this.device.destroy();
    }

    this.adapter = null;
    this.device = null;
    this.initialized = false;
  }
}