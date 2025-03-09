/**
 * PixelBiome Ecosystem Simulator
 * A WebGPU-powered 2D ecosystem simulation
 *
 * @module PixelBiomeSimulator
 * @description A WebGPU-powered ecosystem simulation that can be integrated into any webpage.
 *
 * Usage:
 * 1. Import the module: import { PixelBiomeSimulator } from './scripts/engine/simulator.js';
 * 2. Create a container element: <div id="simulator-container"></div>
 * 3. Initialize the simulator: const simulator = new PixelBiomeSimulator('simulator-container');
 * 4. Control the simulation:
 *    - simulator.startSimulation() - Start the simulation loop
 *    - simulator.stopSimulation() - Pause the simulation
 *    - simulator.toggleSimulation() - Toggle between running/paused states
 *    - simulator.spawnLifeform() - Add a random lifeform to the simulation
 *    - simulator.resetSimulation() - Clear all lifeforms and resources
 *
 * Advanced configuration is available through the constructor's options parameter:
 *
 * ```javascript
 * const simulator = new PixelBiomeSimulator('container-id', {
 *   width: 1024,             // Canvas width in pixels (default: 800)
 *   height: 768,             // Canvas height in pixels (default: 600)
 *   autoStart: true,         // Start simulation automatically (default: false)
 *   showStats: true,         // Show performance stats (default: false)
 *   initialLifeforms: 10,    // Number of lifeforms to create at start (default: 0)
 * });
 * ```
 *
 * @example
 * // Basic initialization
 * document.addEventListener('DOMContentLoaded', () => {
 *   const simulator = new PixelBiomeSimulator('simulator-preview-canvas');
 *
 *   // Add UI controls
 *   document.getElementById('start-button').addEventListener('click', simulator.startSimulation);
 *   document.getElementById('stop-button').addEventListener('click', simulator.stopSimulation);
 *   document.getElementById('spawn-button').addEventListener('click', simulator.spawnLifeform);
 * });
 */

class PixelBiomeSimulator {
  /**
   * Creates a new ecosystem simulator instance
   * @param {string} canvasId - ID of the container element where the canvas should be placed
   * @param {Object} options - Configuration options
   * @param {number} [options.width=800] - Width of the simulation in pixels
   * @param {number} [options.height=600] - Height of the simulation in pixels
   * @param {boolean} [options.autoStart=false] - Whether to start the simulation immediately
   * @param {boolean} [options.showStats=false] - Whether to show performance statistics
   * @param {number} [options.initialLifeforms=0] - Number of random lifeforms to create at start
   */
  constructor(canvasId = 'simulator-preview-canvas', options = {}) {
    this.canvasId = canvasId;
    this.isInitialized = false;
    this.isRunning = false;
    this.device = null;
    this.canvas = null;
    this.context = null;
    this.width = options.width || 800;
    this.height = options.height || 600;
    this.lifeforms = [];
    this.resources = [];
    this.frameCount = 0;
    this.showStats = options.showStats || false;
    this.autoStart = options.autoStart || false;
    this.initialLifeforms = options.initialLifeforms || 0;

    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.startSimulation = this.startSimulation.bind(this);
    this.stopSimulation = this.stopSimulation.bind(this);
    this.toggleSimulation = this.toggleSimulation.bind(this);
    this.spawnLifeform = this.spawnLifeform.bind(this);
    this.resetSimulation = this.resetSimulation.bind(this);
    this.render = this.render.bind(this);

    // Initialize when document is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  async initialize() {
    console.debug('🌱 Initializing PixelBiome simulator... 🚀 initialize');

    try {
      // Check for WebGPU support
      if (!navigator.gpu) {
        console.error('🌱 WebGPU not supported! 🔥 initialize');
        this.showFallbackContent();
        return;
      }

      // Get canvas element
      const container = document.getElementById(this.canvasId);
      if (!container) {
        console.warn('🌱 Canvas container not found! ⚠️ initialize');
        return;
      }

      // Clear any placeholder content
      container.innerHTML = '';

      // Create canvas element
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      container.appendChild(this.canvas);

      // Get GPU adapter and device
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        throw new Error('No appropriate GPUAdapter found!');
      }

      this.device = await adapter.requestDevice();
      this.context = this.canvas.getContext('webgpu');

      // Configure the swap chain
      const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: presentationFormat,
        alphaMode: 'premultiplied',
      });

      // Initialize shaders
      await this.initializeShaders();

      // Enable UI controls
      this.enableControls();

      // Mark as initialized
      this.isInitialized = true;
      console.info('🌱 PixelBiome simulator initialized successfully! ✅ initialize');

      // Display startup scene
      this.render();
    } catch (error) {
      console.error(`🌱 Failed to initialize WebGPU: ${error} 🔥 initialize`);
      this.showFallbackContent(error.message);
    }
  }

  async initializeShaders() {
    // Create initial shader modules
    this.simulationShader = this.device.createShaderModule({
      code: `
        @group(0) @binding(0) var<storage, read> input_data: array<f32>;
        @group(0) @binding(1) var<storage, read_write> output_data: array<f32>;

        struct Params {
          deltaTime: f32,
          width: u32,
          height: u32,
          frameCount: u32,
        }
        @group(0) @binding(2) var<uniform> params: Params;

        @compute @workgroup_size(8, 8)
        fn computeMain(
          @builtin(global_invocation_id) global_id: vec3<u32>
        ) {
          let width = params.width;
          let height = params.height;
          let x = global_id.x;
          let y = global_id.y;

          // Skip if out of bounds
          if (x >= width || y >= height) {
            return;
          }

          // Get index in 1D array based on 2D position
          let index = y * width + x;

          // Simple shader - just pulse a pattern
          var value = sin(f32(params.frameCount) * 0.01 + f32(x + y) * 0.1) * 0.5 + 0.5;

          // Store result
          output_data[index * 4 + 0] = 0.0;                // R
          output_data[index * 4 + 1] = value;              // G
          output_data[index * 4 + 2] = 0.0;                // B
          output_data[index * 4 + 3] = 1.0;                // A
        }
      `,
    });

    this.renderShader = this.device.createShaderModule({
      code: `
        struct VertexInput {
          @location(0) position: vec2<f32>,
          @location(1) texCoord: vec2<f32>,
        };

        struct VertexOutput {
          @builtin(position) position: vec4<f32>,
          @location(0) texCoord: vec2<f32>,
        };

        @vertex
        fn vertexMain(
          @builtin(vertex_index) vertexIndex: u32
        ) -> VertexOutput {
          var pos = array<vec2<f32>, 4>(
            vec2<f32>(-1.0, -1.0),
            vec2<f32>(1.0, -1.0),
            vec2<f32>(-1.0, 1.0),
            vec2<f32>(1.0, 1.0)
          );

          var texCoords = array<vec2<f32>, 4>(
            vec2<f32>(0.0, 1.0),
            vec2<f32>(1.0, 1.0),
            vec2<f32>(0.0, 0.0),
            vec2<f32>(1.0, 0.0)
          );

          var output: VertexOutput;
          output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
          output.texCoord = texCoords[vertexIndex];
          return output;
        }

        @group(0) @binding(0) var texSampler: sampler;
        @group(0) @binding(1) var outputTex: texture_2d<f32>;

        @fragment
        fn fragmentMain(@location(0) texCoord: vec2<f32>) -> @location(0) vec4<f32> {
          return textureSample(outputTex, texSampler, texCoord);
        }
      `,
    });

    // Create buffers
    const bufferSize = this.width * this.height * 4 * Float32Array.BYTES_PER_ELEMENT;
    this.inputBuffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.outputBuffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    this.uniformBuffer = this.device.createBuffer({
      size: 16, // 4 f32 values (deltaTime, width, height, frameCount)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create pipeline
    this.computePipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: this.simulationShader,
        entryPoint: 'computeMain',
      },
    });

    // Create bind group
    this.computeBindGroup = this.device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.inputBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.outputBuffer },
        },
        {
          binding: 2,
          resource: { buffer: this.uniformBuffer },
        },
      ],
    });

    // Create texture for rendering
    this.texture = this.device.createTexture({
      size: [this.width, this.height],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });

    // Create render pipeline
    this.renderPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.renderShader,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: this.renderShader,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: navigator.gpu.getPreferredCanvasFormat(),
          },
        ],
      },
      primitive: {
        topology: 'triangle-strip',
        stripIndexFormat: 'uint32',
      },
    });

    this.renderBindGroup = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: this.sampler,
        },
        {
          binding: 1,
          resource: this.texture.createView(),
        },
      ],
    });
  }

  showFallbackContent(errorMessage = '') {
    const container = document.getElementById(this.canvasId);
    if (!container) return;

    container.innerHTML = `
      <div class="fallback-content">
        <h3>WebGPU Not Available</h3>
        <p>Your browser doesn't support WebGPU, which is required for this simulator.</p>
        <p>Please try using Chrome 113+ or Edge 113+, or enable WebGPU in your browser's flags.</p>
        ${errorMessage ? `<p class="error-message">Error: ${errorMessage}</p>` : ''}
      </div>
    `;
  }

  enableControls() {
    // Enable UI controls
    const spawnButton = document.getElementById('spawn-life');
    const toggleButton = document.getElementById('toggle-simulation');
    const resetButton = document.getElementById('reset-preview');

    if (spawnButton) {
      spawnButton.disabled = false;
      spawnButton.addEventListener('click', this.spawnLifeform);
    }

    if (toggleButton) {
      toggleButton.disabled = false;
      toggleButton.addEventListener('click', this.toggleSimulation);
    }

    if (resetButton) {
      resetButton.disabled = false;
      resetButton.addEventListener('click', this.resetSimulation);
    }
  }

  startSimulation() {
    if (!this.isInitialized) return;

    if (!this.isRunning) {
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.animationId = requestAnimationFrame(this.render);
      console.debug('🌱 Simulation started 🏁 startSimulation');
    }
  }

  stopSimulation() {
    if (this.isRunning) {
      this.isRunning = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      console.debug('🌱 Simulation stopped ⏹️ stopSimulation');
    }
  }

  toggleSimulation() {
    if (this.isRunning) {
      this.stopSimulation();
    } else {
      this.startSimulation();
    }
  }

  spawnLifeform() {
    if (!this.isInitialized) return;

    const x = Math.floor(Math.random() * this.width);
    const y = Math.floor(Math.random() * this.height);

    this.lifeforms.push({
      x, y,
      energy: 100,
      genome: Array.from({length: 16}, () => Math.random()),
      type: Math.floor(Math.random() * 3) // 0 = plant, 1 = herbivore, 2 = carnivore
    });

    console.debug(`🌱 Lifeform spawned at (${x}, ${y}) 🐣 spawnLifeform`);

    // Ensure simulation is running
    if (!this.isRunning) {
      this.startSimulation();
    }
  }

  resetSimulation() {
    this.lifeforms = [];
    this.resources = [];
    this.frameCount = 0;

    console.debug('🌱 Simulation reset 🔄 resetSimulation');

    // Redraw once
    if (!this.isRunning) {
      this.render();
    }
  }

  render() {
    if (!this.isInitialized) return;

    // Calculate delta time
    const now = performance.now();
    const deltaTime = (now - (this.lastFrameTime || now)) / 1000; // in seconds
    this.lastFrameTime = now;

    // Update frame counter
    this.frameCount++;

    // Update uniform buffer
    const uniformData = new Float32Array([
      deltaTime,
      this.width,
      this.height,
      this.frameCount
    ]);

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    // Create command encoder
    const commandEncoder = this.device.createCommandEncoder();

    // Compute pass
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, this.computeBindGroup);
    computePass.dispatchWorkgroups(
      Math.ceil(this.width / 8),
      Math.ceil(this.height / 8)
    );
    computePass.end();

    // Copy output buffer to texture
    commandEncoder.copyBufferToTexture(
      {
        buffer: this.outputBuffer,
        bytesPerRow: this.width * 4 * 4, // 4 floats per pixel, 4 bytes per float
        rowsPerImage: this.height,
      },
      { texture: this.texture },
      [this.width, this.height]
    );

    // Render pass
    const renderPassDescriptor = {
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        },
      ],
    };

    const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);
    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, this.renderBindGroup);
    renderPass.draw(4); // Draw 4 vertices for a quad
    renderPass.end();

    // Submit commands
    this.device.queue.submit([commandEncoder.finish()]);

    // Request next frame if simulation is running
    if (this.isRunning) {
      this.animationId = requestAnimationFrame(this.render);
    }
  }
}

// Initialize simulator
document.addEventListener('DOMContentLoaded', () => {
  console.debug('🌱 DOM Content Loaded, creating simulator... 🚀');
  window.simulator = new PixelBiomeSimulator('simulator-preview-canvas');
});