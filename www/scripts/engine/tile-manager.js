/**
 * Tile Manager
 *
 * This class manages the tile-based world system, coordinating:
 * - Tile creation and distribution
 * - Worker assignment
 * - Entity management across tiles
 * - WebGPU resource allocation for tiles
 */

import { WebGPUManager } from './webgpu-manager.js';

export class TileManager {
  /**
   * Create a new TileManager
   * @param {Object} options - Configuration options
   * @param {number} options.worldWidth - Width of the world in pixels
   * @param {number} options.worldHeight - Height of the world in pixels
   * @param {number} options.tileSize - Size of each tile in pixels
   * @param {number} options.maxEntitiesPerTile - Maximum number of entities per tile
   * @param {WebGPUManager} options.gpuManager - WebGPU manager instance
   */
  constructor(options) {
    // Store options with defaults
    this.worldWidth = options.worldWidth || 2048;
    this.worldHeight = options.worldHeight || 2048;
    this.tileSize = options.tileSize || 512;
    this.maxEntitiesPerTile = options.maxEntitiesPerTile || 1000;

    // WebGPU manager
    this.gpuManager = options.gpuManager || new WebGPUManager();

    // Tiles storage
    this.tiles = new Map();

    // Workers
    this.workers = [];
    this.maxWorkers = navigator.hardwareConcurrency || 4;

    // Entity ID counter
    this.nextEntityId = 0;

    // Features detection
    this.features = {
      webGPU: false,
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      webWorker: typeof Worker !== 'undefined'
    };

    // Binding resources
    this.bindGroupLayouts = {
      simulation: null,
      rendering: null
    };

    // Shader modules
    this.shaders = {
      simulation: null,
      rendering: null
    };

    // Pipelines
    this.pipelines = {
      simulation: null,
      rendering: null
    };
  }

  /**
   * Initialize the tile manager
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize() {
    console.debug('🌍 Initializing TileManager...');

    try {
      // Initialize WebGPU if not already initialized
      if (!this.gpuManager.initialized) {
        const gpuInitialized = await this.gpuManager.initialize();
        if (!gpuInitialized) {
          console.warn('WebGPU initialization failed, falling back to CPU');
          this.features.webGPU = false;
          // We can continue without WebGPU, just using CPU fallbacks
        } else {
          this.features.webGPU = true;
        }
      } else {
        this.features.webGPU = true;
      }

      // Set up tile grid
      await this.createTileGrid();

      // Initialize workers if available
      if (this.features.webWorker) {
        await this.initializeWorkers();
      }

      // Load WebGPU shaders and create pipelines
      if (this.features.webGPU) {
        await this.initializeShaders();
      }

      console.debug('🌍 TileManager initialized successfully');
      return true;
    } catch (error) {
      console.error('TileManager initialization error:', error);
      return false;
    }
  }

  /**
   * Create tile grid based on world size and tile size
   * @private
   */
  async createTileGrid() {
    // Calculate number of tiles in each dimension
    const tilesX = Math.ceil(this.worldWidth / this.tileSize);
    const tilesY = Math.ceil(this.worldHeight / this.tileSize);

    console.debug(`🌍 Creating tile grid: ${tilesX}x${tilesY} tiles`);

    // Create tiles
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const tileId = `tile-${x}-${y}`;

        // Calculate position and dimensions
        const left = x * this.tileSize;
        const top = y * this.tileSize;
        const right = Math.min(left + this.tileSize, this.worldWidth);
        const bottom = Math.min(top + this.tileSize, this.worldHeight);

        // Create tile object
        const tile = {
          id: tileId,
          x, y,
          left, top, right, bottom,
          width: right - left,
          height: bottom - top,
          entities: [],
          canvas: null,
          context: null,
          worker: null,
          ready: false,
          lastUpdate: 0,
          neighborTiles: [],
          // WebGPU resources
          buffers: {
            input: null,
            output: null,
            params: null,
            staging: null
          },
          bindGroups: {
            simulation: null
          }
        };

        // Create OffscreenCanvas for this tile if supported
        if (this.features.offscreenCanvas) {
          tile.canvas = new OffscreenCanvas(tile.width, tile.height);
        }

        // Store the tile
        this.tiles.set(tileId, tile);
      }
    }

    // Link neighboring tiles
    for (const [id, tile] of this.tiles) {
      // Get the 8 surrounding tiles
      const neighbors = [];

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          // Skip the tile itself
          if (dx === 0 && dy === 0) {continue;}

          // Calculate neighbor coordinates
          const nx = tile.x + dx;
          const ny = tile.y + dy;

          // Get neighbor tile if it exists
          const neighborId = `tile-${nx}-${ny}`;
          const neighbor = this.tiles.get(neighborId);

          // Add to neighbors if it exists
          if (neighbor) {
            neighbors.push(neighbor);
          }
        }
      }

      // Store neighbors
      tile.neighborTiles = neighbors;
    }

    console.debug(`🌍 Created ${this.tiles.size} tiles`);
  }

  /**
   * Initialize Web Workers for distributed processing
   * @private
   */
  async initializeWorkers() {
    // Calculate optimal number of workers
    const workerCount = Math.min(this.maxWorkers, this.tiles.size);

    console.debug(`🧵 Creating ${workerCount} web workers`);

    // Create workers
    for (let i = 0; i < workerCount; i++) {
      try {
        const worker = new Worker('/scripts/engine/tile-worker.js', { type: 'module' });

        // Set up message handler
        worker.onmessage = (event) => {return this.handleWorkerMessage(worker, event)};

        // Handle errors
        worker.onerror = (error) => {
          console.error(`Worker ${i} error:`, error);
        };

        // Store worker
        this.workers.push({
          id: i,
          worker,
          assignedTiles: [],
          busy: false,
          lastMessage: Date.now()
        });

        // Initialize the worker
        worker.postMessage({
          type: 'init',
          workerId: i,
          worldWidth: this.worldWidth,
          worldHeight: this.worldHeight,
          tileSize: this.tileSize,
          features: this.features
        });
      } catch (error) {
        console.error(`Failed to create worker ${i}:`, error);
      }
    }

    // Assign tiles to workers (distribute evenly)
    let workerIndex = 0;
    for (const [id, tile] of this.tiles) {
      const workerInfo = this.workers[workerIndex];

      // Assign tile to this worker
      tile.worker = workerInfo;
      workerInfo.assignedTiles.push(tile);

      // If OffscreenCanvas is supported, transfer it to the worker
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
            neighborIds: tile.neighborTiles.map(n => {return n.id})
          },
          canvas: transferableCanvas
        }, [transferableCanvas]);

        // The canvas is now transferred to the worker
        tile.canvas = null;
      } else {
        // Send message without canvas transfer
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
            neighborIds: tile.neighborTiles.map(n => {return n.id})
          }
        });
      }

      // Move to next worker (round-robin assignment)
      workerIndex = (workerIndex + 1) % this.workers.length;
    }

    console.debug(`🧵 Assigned ${this.tiles.size} tiles to ${this.workers.length} workers`);
  }

  /**
   * Initialize WebGPU shaders and pipelines
   * @private
   */
  async initializeShaders() {
    if (!this.features.webGPU) {return;}

    try {
      console.debug('🌍 Loading WebGPU shaders...');

      // Load shader modules
      const shaderModules = await this.gpuManager.loadShaders(
        '/scripts/shaders/entity-simulation.wgsl',
        '/scripts/shaders/entity-render.wgsl',
        {
          WORKGROUP_SIZE: '64',
          MAX_ENTITIES: this.maxEntitiesPerTile.toString()
        }
      );

      this.shaders.simulation = shaderModules.computeShader;
      this.shaders.rendering = shaderModules.renderShader;

      // Create compute pipeline
      this.pipelines.simulation = await this.gpuManager.createComputePipeline(
        this.shaders.simulation
      );

      console.debug('🌍 WebGPU shaders and pipelines initialized');
    } catch (error) {
      console.error('Failed to initialize WebGPU shaders:', error);
      this.features.webGPU = false;
    }
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
      case 'tileReady':
        // Mark tile as ready
        const tile = this.tiles.get(tileId);
        if (tile) {
          tile.ready = true;
          console.debug(`🌍 Tile ${tileId} ready`);
        }
        break;

      case 'tileUpdate':
        // Handle tile update data (entity positions, state changes)
        this.updateTileData(tileId, data);
        break;

      case 'workerStatus':
        // Update worker status (e.g., WebGPU initialization)
        const {workerId} = data;
        const workerInfo = this.workers.find(w => {return w.id === workerId});
        if (workerInfo) {
          workerInfo.lastMessage = Date.now();
          if (data.status === 'gpu-ready') {
            console.debug(`🧵 Worker ${workerId} initialized WebGPU`);
          } else if (data.status === 'gpu-failed') {
            console.warn(`🧵 Worker ${workerId} failed to initialize WebGPU: ${data.error}`);
          }
        }
        break;

      default:
        console.debug('Unknown worker message type:', type);
    }
  }

  /**
   * Update tile data based on worker message
   * @param {string} tileId - ID of the tile to update
   * @param {Object} data - Update data
   * @private
   */
  updateTileData(tileId, data) {
    const tile = this.tiles.get(tileId);
    if (!tile) {return;}

    // Update entities
    if (data.entities) {
      tile.entities = data.entities;
    }

    // Update last update timestamp
    tile.lastUpdate = Date.now();
  }

  /**
   * Spawn a new entity in a tile
   * @param {Object} options - Entity options
   * @param {number} options.x - X position
   * @param {number} options.y - Y position
   * @param {number} options.species - Species type
   * @param {number} options.energy - Initial energy
   * @param {number} options.size - Entity size
   * @returns {Object} - The created entity
   */
  spawnEntity(options) {
    // Find the tile that should contain this entity
    let targetTileId = null;

    for (const [id, tile] of this.tiles) {
      if (options.x >= tile.left && options.x < tile.right &&
          options.y >= tile.top && options.y < tile.bottom) {
        targetTileId = id;
        break;
      }
    }

    if (!targetTileId) {
      console.warn('Entity position outside world bounds:', options);
      return null;
    }

    const tile = this.tiles.get(targetTileId);

    // Create entity with default values for missing properties
    const entity = {
      id: this.nextEntityId++,
      x: options.x,
      y: options.y,
      vx: options.vx || 0,
      vy: options.vy || 0,
      energy: options.energy || 100,
      species: options.species || 0,
      size: options.size || 5,
      age: 0,
      ...options
    };

    // Add to local tile entity list
    tile.entities.push(entity);

    // Send to worker if assigned
    if (tile.worker) {
      tile.worker.worker.postMessage({
        type: 'spawnEntity',
        tileId: targetTileId,
        entity
      });
    }

    return entity;
  }

  /**
   * Spawn multiple entities
   * @param {number} count - Number of entities to spawn
   * @param {Object} options - Entity options
   */
  spawnEntities(count, options = {}) {
    for (let i = 0; i < count; i++) {
      // Random position within world bounds if not specified
      const x = options.x !== undefined ? options.x : Math.random() * this.worldWidth;
      const y = options.y !== undefined ? options.y : Math.random() * this.worldHeight;

      // Random velocity if not specified
      const vx = options.vx !== undefined ? options.vx : (Math.random() * 2 - 1) * 10;
      const vy = options.vy !== undefined ? options.vy : (Math.random() * 2 - 1) * 10;

      // Random species if not specified
      const species = options.species !== undefined ? options.species :
                     Math.floor(Math.random() * 3); // 0=plant, 1=herbivore, 2=carnivore

      // Spawn entity
      this.spawnEntity({
        x, y, vx, vy, species,
        energy: options.energy || 100,
        size: options.size || (species === 0 ? 3 : species === 1 ? 5 : 7)
      });
    }
  }

  /**
   * Start simulation across all tiles
   */
  start() {
    for (const workerInfo of this.workers) {
      workerInfo.worker.postMessage({
        type: 'control',
        action: 'start'
      });
    }
  }

  /**
   * Stop simulation across all tiles
   */
  stop() {
    for (const workerInfo of this.workers) {
      workerInfo.worker.postMessage({
        type: 'control',
        action: 'stop'
      });
    }
  }

  /**
   * Reset simulation on all tiles
   */
  reset() {
    for (const workerInfo of this.workers) {
      workerInfo.worker.postMessage({
        type: 'control',
        action: 'reset'
      });
    }

    // Reset entity counter
    this.nextEntityId = 0;
  }

  /**
   * Get current entity statistics
   * @returns {Object} - Statistics about entities
   */
  getStats() {
    let totalEntities = 0;
    const speciesCounts = [0, 0, 0]; // plants, herbivores, carnivores

    for (const [id, tile] of this.tiles) {
      totalEntities += tile.entities.length;

      for (const entity of tile.entities) {
        const speciesIndex = Math.min(entity.species, 2);
        speciesCounts[speciesIndex]++;
      }
    }

    return {
      totalEntities,
      plants: speciesCounts[0],
      herbivores: speciesCounts[1],
      carnivores: speciesCounts[2],
      tileCount: this.tiles.size,
      workerCount: this.workers.length
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Terminate all workers
    for (const workerInfo of this.workers) {
      workerInfo.worker.terminate();
    }
    this.workers = [];

    // Clear tiles
    this.tiles.clear();

    console.debug('🌍 TileManager destroyed');
  }
}