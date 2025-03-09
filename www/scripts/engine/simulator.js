/**
 * Jesse's World Ecosystem Simulator
 * A WebGPU-powered 2D ecosystem simulation
 *
 * @module JessesWorldSimulator
 * @description A WebGPU-powered ecosystem simulation that can be integrated into any webpage.
 *
 * Usage:
 * 1. Import the module: import { JessesWorldSimulator } from './scripts/engine/simulator.js';
 * 2. Create a container element: <div id="simulator-container"></div>
 * 3. Initialize the simulator: const simulator = new JessesWorldSimulator('simulator-container');
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
 * const simulator = new JessesWorldSimulator('container-id', {
 *   width: 1024,             // Canvas width in pixels (default: 800)
 *   height: 768,             // Canvas height in pixels (default: 600)
 *   autoStart: true,         // Start simulation automatically (default: false)
 *   showStats: true,         // Show performance stats (default: false)
 *   initialLifeforms: 10,    // Number of lifeforms to create at start (default: 0)
 *   tileSize: 256,           // Size of each world tile in pixels (default: 256)
 *   workerCount: 4,          // Maximum number of web workers to use (default: navigator.hardwareConcurrency or 4)
 * });
 * ```
 *
 * @example
 * // Basic initialization
 * document.addEventListener('DOMContentLoaded', () => {
 *   const simulator = new JessesWorldSimulator('simulator-preview-canvas');
 *
 *   // Add UI controls
 *   document.getElementById('start-button').addEventListener('click', simulator.startSimulation);
 *   document.getElementById('stop-button').addEventListener('click', simulator.stopSimulation);
 *   document.getElementById('spawn-button').addEventListener('click', simulator.spawnLifeform);
 * });
 */

class JessesWorldSimulator {
  /**
   * Creates a new ecosystem simulator instance
   * @param {string} canvasId - ID of the container element where the canvas should be placed
   * @param {Object} options - Configuration options
   * @param {number} [options.width=800] - Width of the simulation in pixels
   * @param {number} [options.height=600] - Height of the simulation in pixels
   * @param {boolean} [options.autoStart=false] - Whether to start the simulation immediately
   * @param {boolean} [options.showStats=false] - Whether to show performance statistics
   * @param {number} [options.initialLifeforms=0] - Number of random lifeforms to create at start
   * @param {number} [options.tileSize=256] - Size of each world tile in pixels
   * @param {number} [options.workerCount] - Maximum number of web workers to use (defaults to hardware concurrency)
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

    // Tile-based world configuration
    this.tileSize = options.tileSize || 256;
    this.workerCount = options.workerCount || (navigator.hardwareConcurrency || 4);
    /** @type {Array<any>} */
    this.tiles = [];
    /** @type {Array<any>} */
    this.workers = [];

    // Track feature support
    this.features = {
      webGPU: false,
      offscreenCanvas: false,
      webWorker: typeof Worker !== 'undefined',
      structuredCloning: typeof window.structuredClone !== 'undefined'
    };

    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.startSimulation = this.startSimulation.bind(this);
    this.stopSimulation = this.stopSimulation.bind(this);
    this.toggleSimulation = this.toggleSimulation.bind(this);
    this.spawnLifeform = this.spawnLifeform.bind(this);
    this.resetSimulation = this.resetSimulation.bind(this);
    this.render = this.render.bind(this);
    this.initTiles = this.initTiles.bind(this);
    this.initWorkers = this.initWorkers.bind(this);

    // Initialize when document is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.initialize);
    } else {
      this.initialize();
    }
  }

  /**
   * Initialize the simulator with WebGPU and set up tiles with web workers
   */
  async initialize() {
    console.debug('🌱 Initializing PixelBiome simulator... 🚀 initialize');

    try {
      // Get the container element
      const container = document.getElementById(this.canvasId);
      if (!container) {
        throw new Error(`Container element with ID "${this.canvasId}" not found.`);
      }

      // Check for WebGPU support
      /** @type {any} */
      const gpuNavigator = navigator;
      if (!gpuNavigator.gpu) {
        throw new Error('WebGPU is not supported in this browser');
      }
      this.features.webGPU = true;

      // Check for OffscreenCanvas support
      this.features.offscreenCanvas = typeof OffscreenCanvas !== 'undefined';

      // Create main canvas element
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
      container.innerHTML = ''; // Clear the container
      container.appendChild(this.canvas);

      // Request adapter and device
      const adapter = await gpuNavigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!adapter) {
        throw new Error('WebGPU adapter not available');
      }

      this.device = await adapter.requestDevice();

      // Set up WebGPU context on the main canvas
      this.context = this.canvas.getContext('webgpu');
      const canvasFormat = gpuNavigator.gpu.getPreferredCanvasFormat();

      /** @type {any} */
      const webgpuContext = this.context;
      webgpuContext.configure({
        device: this.device,
        format: canvasFormat,
        alphaMode: 'premultiplied'
      });

      // Initialize the world tiles
      await this.initTiles();

      // Initialize the web workers
      if (this.features.webWorker) {
        await this.initWorkers();
      }

      // Initialize shaders for the main canvas
      await this.initializeShaders();

      // Enable UI controls now that we're initialized
      this.enableControls();
      this.isInitialized = true;

      // Auto-start simulation if configured
      if (this.autoStart) {
        this.startSimulation();
      }

      console.debug('🌱 PixelBiome simulator initialized successfully ✅ initialize');
    } catch (error) {
      console.error('Failed to initialize PixelBiome simulator:', error);
      this.showFallbackContent(error.message);
    }
  }

  /**
   * Initialize the world tiles based on the world size and tile size
   * @private
   */
  async initTiles() {
    // Calculate number of tiles in each dimension
    const tilesX = Math.ceil(this.width / this.tileSize);
    const tilesY = Math.ceil(this.height / this.tileSize);

    console.debug(`🌱 Creating ${tilesX}x${tilesY} world tiles...`);

    // Create tile objects with their coordinates and offscreen canvases
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        // Calculate actual pixel bounds for this tile
        const left = x * this.tileSize;
        const top = y * this.tileSize;
        const right = Math.min((x + 1) * this.tileSize, this.width);
        const bottom = Math.min((y + 1) * this.tileSize, this.height);
        const tileWidth = right - left;
        const tileHeight = bottom - top;

        let offscreenCanvas = null;
        let renderContext = null;

        // Create OffscreenCanvas for this tile if supported
        if (this.features.offscreenCanvas) {
          offscreenCanvas = new OffscreenCanvas(tileWidth, tileHeight);

          // Configure WebGPU on the offscreen canvas if needed
          // Note: For WebGPU + OffscreenCanvas to work, we'll need to transfer it to a worker
          renderContext = offscreenCanvas.getContext('2d'); // Fallback to 2D context for now
        }

        // Create tile object
        const tile = {
          id: `tile-${x}-${y}`,
          x, y,
          left, top, right, bottom,
          width: tileWidth,
          height: tileHeight,
          canvas: offscreenCanvas,
          context: renderContext,
          /** @type {any} */
          worker: null,
          /** @type {Array<any>} */
          entities: [],
          // State of the tile
          ready: false,
          active: true,
          lastUpdated: 0,
          /** @type {Array<any>} */
          neighborTiles: []
        };

        this.tiles.push(tile);
      }
    }

    // Set up neighbor relationships between tiles for communication
    for (const tile of this.tiles) {
      // Find all adjacent tiles
      tile.neighborTiles = this.tiles.filter((/** @type {any} */ other) => {
        // A tile is a neighbor if it's adjacent (including diagonals)
        return Math.abs(other.x - tile.x) <= 1 &&
               Math.abs(other.y - tile.y) <= 1 &&
               other !== tile;
      });
    }

    console.debug(`🌱 Created ${this.tiles.length} world tiles ✅`);
  }

  /**
   * Initialize web workers for processing the world tiles
   * @private
   */
  async initWorkers() {
    // Calculate optimal number of workers
    // Use at most as many workers as we have tiles, but no more than workerCount
    const optimalWorkerCount = Math.min(this.tiles.length, this.workerCount);

    console.debug(`🌱 Creating ${optimalWorkerCount} web workers...`);

    // Create workers
    for (let i = 0; i < optimalWorkerCount; i++) {
      try {
        const worker = new Worker('/scripts/engine/tile-worker.js', { type: 'module' });

        // Set up message handler for this worker
        worker.onmessage = (event) => { this.handleWorkerMessage(worker, event); };

        // Handle worker errors
        worker.onerror = (error) => {
          console.error(`Worker ${i} error:`, error);
        };

        // Store the worker
        this.workers.push({
          id: i,
          worker,
          assignedTiles: [], // Will contain references to assigned tiles
          busy: false,
          lastMessage: 0
        });

        // Initialize the worker
        worker.postMessage({
          type: 'init',
          workerId: i,
          worldWidth: this.width,
          worldHeight: this.height,
          tileSize: this.tileSize,
          features: this.features
        });
      } catch (error) {
        console.error(`Failed to create worker ${i}:`, error);
      }
    }

    // Assign tiles to workers (distribute evenly)
    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];
      const workerIndex = i % this.workers.length;
      const workerInfo = this.workers[workerIndex];

      // Assign this tile to the worker
      tile.worker = workerInfo;
      workerInfo.assignedTiles.push(tile);

      // If OffscreenCanvas is supported and the tile has a canvas, transfer it to the worker
      if (this.features.offscreenCanvas && tile.canvas) {
        const transferableCanvas = tile.canvas;

        // Send message to worker with the canvas
        workerInfo.worker.postMessage({
          type: 'assignTile',
          tileId: tile.id,
          tileInfo: {
            id: tile.id,
            x: tile.x,
            y: tile.y,
            left: tile.left,
            top: tile.top,
            width: tile.width,
            height: tile.height,
            neighborIds: tile.neighborTiles.map((/** @type {any} */ n) => {return n.id})
          },
          // Transfer the canvas
          canvas: transferableCanvas
        }, [transferableCanvas]);

        // The original canvas is now detached as it's been transferred
        tile.canvas = null;
      } else {
        // Send message to worker without canvas transfer
        workerInfo.worker.postMessage({
          type: 'assignTile',
          tileId: tile.id,
          tileInfo: {
            id: tile.id,
            x: tile.x,
            y: tile.y,
            left: tile.left,
            top: tile.top,
            width: tile.width,
            height: tile.height,
            neighborIds: tile.neighborTiles.map((/** @type {any} */ n) => {return n.id})
          }
        });
      }
    }

    console.debug(`🌱 Created and assigned ${this.workers.length} web workers ✅`);
  }

  /**
   * Handle messages from web workers
   * @param {Worker} worker - The worker that sent the message
   * @param {MessageEvent} event - The message event
   * @private
   */
  handleWorkerMessage(worker, event) {
    const { type, tileId, ...data } = event.data;

    switch (type) {
      case 'tileReady': {
        // Mark the tile as ready for rendering
        const tile = this.tiles.find((/** @type {any} */ t) => {return t.id === tileId});
        if (tile) {
          tile.ready = true;
          console.debug(`🌱 Tile ${tileId} ready`);
        }
        break;
      }

      case 'tileUpdate':
        // Handle tile update data (e.g., entity positions, state changes)
        // This is used to update the main canvas from worker-processed data
        this.updateTileData(tileId, data);
        break;

      case 'workerStatus': {
        // Update status of the worker
        const workerInfo = this.workers.find((/** @type {any} */ w) => {return w.worker === worker});
        if (workerInfo) {
          workerInfo.busy = data.busy;
          workerInfo.lastMessage = Date.now();
          // Additional worker status handling if needed
        }
        break;
      }

      default:
        console.warn(`Unknown worker message type: ${type}`);
    }
  }

  /**
   * Update the simulation data for a specific tile
   * @param {string} tileId - ID of the tile to update
   * @param {Object} data - Update data from the worker
   * @private
   */
  updateTileData(tileId, data) {
    const tile = this.tiles.find((/** @type {any} */ t) => {return t.id === tileId});
    if (!tile) { return; }

    // Update entity data for this tile
    if (data.entities) {
      tile.entities = data.entities;
    }

    // Update timestamp
    tile.lastUpdated = Date.now();

    // Additional tile data handling as needed
  }

  /**
   * Create initial shader modules
   */
  async initializeShaders() {
    // Create initial shader modules
    this.simulationShader = this.device.createShaderModule({
      label: 'Main simulation shader',
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
  }

  /**
   * Display fallback content if WebGPU initialization fails
   * @param {string} errorMessage - Error message to display
   * @private
   */
  showFallbackContent(errorMessage = '') {
    const container = document.getElementById(this.canvasId);
    if (!container) { return; }

    // Create fallback content
    const fallback = document.createElement('div');
    fallback.className = 'canvas-placeholder';
    fallback.innerHTML = `
      <div class="error-message">
        <h3>WebGPU Not Available</h3>
        <p>${errorMessage || 'Your browser does not support WebGPU, or it may be disabled.'}</p>
        <p>For the best experience, please try Chrome 113+, Edge 113+, or another browser with WebGPU enabled.</p>
        <p><small>Support status: ${JSON.stringify(this.features)}</small></p>
      </div>
    `;

    // Replace container contents
    container.innerHTML = '';
    container.appendChild(fallback);
  }

  /**
   * Enable UI controls for the simulator
   * @private
   */
  enableControls() {
    // Enable spawn button
    const spawnButton = /** @type {HTMLButtonElement} */ (document.getElementById('spawn-life'));
    if (spawnButton) {
      spawnButton.disabled = false;
      spawnButton.addEventListener('click', this.spawnLifeform);
    }

    // Enable toggle button
    const toggleButton = /** @type {HTMLButtonElement} */ (document.getElementById('toggle-simulation'));
    if (toggleButton) {
      toggleButton.disabled = false;
      toggleButton.addEventListener('click', this.toggleSimulation);
    }

    // Enable reset button
    const resetButton = /** @type {HTMLButtonElement} */ (document.getElementById('reset-preview'));
    if (resetButton) {
      resetButton.disabled = false;
      resetButton.addEventListener('click', this.resetSimulation);
    }
  }

  /**
   * Start the simulation loop
   */
  startSimulation() {
    if (this.isRunning) { return; }

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.render);

    // Notify all workers to start updating their tiles
    this.workers.forEach(workerInfo => {
      workerInfo.worker.postMessage({
        type: 'control',
        action: 'start'
      });
    });

    console.debug('🌱 Simulation started ▶️');
  }

  /**
   * Stop the simulation loop
   */
  stopSimulation() {
    if (!this.isRunning) { return; }

    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Notify all workers to stop updating their tiles
    this.workers.forEach(workerInfo => {
      workerInfo.worker.postMessage({
        type: 'control',
        action: 'stop'
      });
    });

    console.debug('🌱 Simulation stopped ⏸');
  }

  /**
   * Toggle between running and paused states
   */
  toggleSimulation() {
    if (this.isRunning) {
      this.stopSimulation();
    } else {
      this.startSimulation();
    }
  }

  /**
   * Add a new lifeform to the simulation at a random location
   */
  spawnLifeform() {
    if (!this.isInitialized) { return; }

    // Generate a random position within the world
    const x = Math.floor(Math.random() * this.width);
    const y = Math.floor(Math.random() * this.height);

    // Determine which tile this position belongs to
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);

    // Find the tile that contains this position
    const tile = this.tiles.find(t => {return t.x === tileX && t.y === tileY});

    if (tile && tile.worker) {
      // Send message to the worker to spawn a lifeform in this tile
      tile.worker.worker.postMessage({
        type: 'spawnEntity',
        tileId: tile.id,
        entity: {
          type: 'lifeform',
          x: x - tile.left, // Adjust position to be relative to tile
          y: y - tile.top,
          energy: 100,
          species: Math.floor(Math.random() * 5), // Random species type
          size: 5 + Math.random() * 5,
          // Add more properties as needed
        }
      });

      console.debug(`🌱 Spawned lifeform at (${x}, ${y}) in tile ${tile.id}`);
    }
  }

  /**
   * Reset the simulation by clearing all lifeforms and resources
   */
  resetSimulation() {
    if (!this.isInitialized) { return; }

    // Stop the simulation first
    const wasRunning = this.isRunning;
    if (wasRunning) {
      this.stopSimulation();
    }

    // Send reset command to all workers
    this.workers.forEach(workerInfo => {
      workerInfo.worker.postMessage({
        type: 'control',
        action: 'reset'
      });
    });

    // Clear local entity caches
    this.tiles.forEach(tile => {
      tile.entities = [];
    });

    // Reset frame counter
    this.frameCount = 0;

    console.debug('🌱 Simulation reset 🔄');

    // Restart if it was running before
    if (wasRunning) {
      this.startSimulation();
    }
  }

  /**
   * Main render loop that handles compositing tile outputs onto the main canvas
   * @param {number} timestamp - Current animation frame timestamp
   * @private
   */
  render(timestamp) {
    if (!this.isInitialized || !this.isRunning) { return; }

    // Calculate delta time
    const deltaTime = timestamp - (this.lastFrameTime || timestamp);
    this.lastFrameTime = timestamp;

    // Increment frame counter
    this.frameCount++;

    // Begin drawing to the main canvas
    const encoder = this.device.createCommandEncoder();
    /** @type {any} */
    const currentTexture = webgpuContext.getCurrentTexture();
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: currentTexture.createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0.0, g: 0.05, b: 0.1, a: 1.0 },
        }
      ]
    });

    // Complete the render pass
    renderPass.end();

    // Submit commands
    this.device.queue.submit([encoder.finish()]);

    // Composite tile outputs onto main canvas
    // Note: This is simplified and will be replaced with proper WebGPU rendering
    const ctx = this.canvas.getContext('2d');

    // Clear canvas first
    ctx.fillStyle = '#0a1e12';
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw debug grid to visualize tiles
    ctx.strokeStyle = 'rgba(127, 224, 132, 0.3)';
    ctx.lineWidth = 1;

    for (let y = 0; y <= this.height; y += this.tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    for (let x = 0; x <= this.width; x += this.tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    // Draw entities from all tiles (for demonstration)
    ctx.fillStyle = '#7fe084';

    this.tiles.forEach((/** @type {any} */ tile) => {
      // Draw tile ID for debugging
      ctx.font = '12px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(tile.id, tile.left + 5, tile.top + 15);

      // Draw entities in this tile
      ctx.fillStyle = '#7fe084';
      tile.entities.forEach((/** @type {any} */ entity) => {
        if (entity.type === 'lifeform') {
          ctx.beginPath();
          ctx.arc(tile.left + entity.x, tile.top + entity.y, entity.size || 5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });

    // Draw frame counter
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`Frame: ${this.frameCount}`, 10, 26);

    // Continue animation loop
    if (this.isRunning) {
      this.animationFrameId = requestAnimationFrame(this.render);
    }
  }
}

// Initialize simulator
document.addEventListener('DOMContentLoaded', () => {
  console.debug('🌱 DOM Content Loaded, creating simulator... 🚀');
  /** @type {any} */
  window.simulator = new JessesWorldSimulator('simulator-preview-canvas');
});

/**
 * Test that initializes the simulator, sets up tiles, and creates Web Workers.
 */
function testInitializeSimulator() {
  // Create a new instance of JessesWorldSimulator
  const simulator = new JessesWorldSimulator('simulator-container', {
    width: 1024,
    height: 768,
    autoStart: true,
    showStats: true,
    initialLifeforms: 10,
    tileSize: 256,
    workerCount: 4
  });

  // Log the simulator instance to verify initialization
  console.log('Simulator initialized:', simulator);
}

document.addEventListener('DOMContentLoaded', testInitializeSimulator);