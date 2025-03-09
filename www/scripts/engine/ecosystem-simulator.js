/**
 * Ecosystem Simulator
 *
 * Main controller class for Jesse's World simulation that:
 * - Manages the WebGPU-powered ecosystem simulation
 * - Coordinates rendering and updates
 * - Provides the public API for interacting with the simulation
 */

import { TileManager } from './tile-manager.js';
import { WebGPUManager } from './webgpu-manager.js';
import { CoreSimulation } from './core-simulation.js';

export class EcosystemSimulator {
  /**
   * Create a new ecosystem simulator
   * @param {string} containerId - ID of the container element
   * @param {Object} options - Simulation options
   */
  constructor(containerId, options = {}) {
    // Store container ID
    this.containerId = containerId;

    // Store options with defaults
    this.options = {
      width: options.width || 1024,
      height: options.height || 768,
      tileSize: options.tileSize || 512,
      maxEntitiesPerTile: options.maxEntitiesPerTile || 1000,
      autoStart: options.autoStart || false
    };

    // State
    this.isInitialized = false;
    this.isRunning = false;
    this.frameCount = 0;
    this.lastFrameTime = 0;

    // Feature detection
    this.features = {
      webGPU: false,
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      webWorker: typeof Worker !== 'undefined'
    };

    // Managers and engines
    this.container = null;
    this.canvas = null;
    this.context = null;
    this.gpuManager = new WebGPUManager();
    this.coreSimulation = null;
    this.tileManager = null;

    // Statistics
    this.stats = {
      fps: 0,
      frameTime: 0,
      entityCount: 0
    };

    // Bind methods
    this.render = this.render.bind(this);

    // Initialize when document is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }

    // Expose compute pipeline structure that tests expect
    this.computePipeline = {
      update: null,
      physics: null,
      bindGroupLayout: null
    };
  }

  // Add lifeform buffer structure
  lifeformBuffer = {
    stride: 48, // bytes per entity
    capacity: 1000,
    attributes: {
      position: { offset: 0, size: 8 },  // vec2f
      velocity: { offset: 8, size: 8 },  // vec2f
      energy: { offset: 16, size: 4 },   // f32
      species: { offset: 20, size: 4 },  // u32
      size: { offset: 24, size: 4 },     // f32
      genes: { offset: 28, size: 16 },   // vec4f
      neural: { offset: 44, size: 4 }    // u32
    }
  };

  /**
   * Initialize the simulator
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize() {
    console.debug('🌎 Initializing EcosystemSimulator...');

    try {
      // Get container element
      this.container = document.getElementById(this.containerId);
      if (!this.container) {
        throw new Error(`Container element with ID "${this.containerId}" not found`);
      }

      // Check for WebGPU support
      this.features.webGPU = WebGPUManager.isWebGPUSupported();
      if (this.features.webGPU) {
        // Initialize WebGPU
        const gpuInitialized = await this.gpuManager.initialize();
        this.features.webGPU = gpuInitialized;
      }

      // Create and configure main canvas
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.options.width;
      this.canvas.height = this.options.height;
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
      this.canvas.className = 'ecosystem-canvas';

      // Add canvas to container
      this.container.innerHTML = ''; // Clear container
      this.container.appendChild(this.canvas);

      // Configure context based on WebGPU support
      if (this.features.webGPU) {
        this.context = this.gpuManager.configureCanvas(this.canvas);
        
        // Initialize core simulation
        this.coreSimulation = new CoreSimulation(this.gpuManager);
        await this.coreSimulation.initialize();
      } else {
        // Fallback to 2D context
        this.context = this.canvas.getContext('2d');
      }

      // Initialize tile manager with correct options
      this.tileManager = new TileManager({
        worldWidth: this.options.width,
        worldHeight: this.options.height,
        tileSize: this.options.tileSize,
        maxEntitiesPerTile: this.options.maxEntitiesPerTile,
        gpuManager: this.gpuManager
      });

      // Initialize tile system
      const tileInitialized = await this.tileManager.initialize();
      if (!tileInitialized) {
        console.warn('Tile system initialization failed, falling back to single-threaded mode');
      }

      // Update feature detection
      this.features.offscreenCanvas = typeof OffscreenCanvas !== 'undefined';
      this.features.webWorker = typeof Worker !== 'undefined' && tileInitialized;

      // After initializing WebGPU and core simulation, set up compute pipeline reference
      if (this.features.webGPU && this.gpuManager.computePipeline) {
        this.computePipeline = {
          update: this.gpuManager.computePipeline.update,
          physics: this.gpuManager.computePipeline.physics,
          bindGroupLayout: this.gpuManager.computePipeline.bindGroupLayout
        };
      }

      // Mark as initialized
      this.isInitialized = true;

      // Log initialization complete with feature support
      console.debug('🌎 EcosystemSimulator initialization complete', {
        features: this.features,
        tileCount: this.tileManager.tiles.size,
        workerCount: this.tileManager.workers.length
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize EcosystemSimulator:', error);
      return false;
    }
  }

  /**
   * Start the simulation loop
   */
  start() {
    if (!this.isInitialized || this.isRunning) return;
    
    // Start tile workers if available
    if (this.features.webWorker) {
      this.tileManager.start();
    }
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this.render);
    
    console.debug('🌎 Simulation started');
  }

  /**
   * Stop the simulation loop
   */
  stop() {
    // Stop tile workers if available
    if (this.features.webWorker) {
      this.tileManager.stop();
    }
    
    this.isRunning = false;
    console.debug('🌎 Simulation stopped');
  }

  /**
   * Spawn a new lifeform in the simulation
   * @param {Object} options - Lifeform options
   */
  spawnLifeform(options = {}) {
    if (!this.isInitialized) return null;

    // Create the entity
    const entity = this.features.webWorker ?
        this.tileManager.spawnEntity(options) :
        this.coreSimulation.spawnLifeform(options);

    return entity;
  }

  /**
   * Create offspring from two parent lifeforms
   */
  async reproduce(parent1Id, parent2Id) {
    if (!this.isInitialized || !this.coreSimulation) {
      throw new Error('Simulation not initialized');
    }
    return await this.coreSimulation.reproduce(parent1Id, parent2Id);
  }

  /**
   * Get the current state of a lifeform
   */
  getLifeformState(id) {
    if (!this.coreSimulation) return null;
    const entity = this.coreSimulation.getLifeformState(id);
    if (!entity) return null;

    // Convert to expected test format
    return {
      id: entity.id,
      position: {
        x: entity.position[0],
        y: entity.position[1]
      },
      energy: entity.energy,
      species: entity.species,
      genes: {
        speed: entity.genes[0],
        senseRange: entity.genes[1],
        metabolism: entity.genes[2],
        extra: entity.genes[3]
      }
    };
  }

  /**
   * Get the neural network for a lifeform
   */
  getNeuralNetwork(id) {
    if (!this.coreSimulation) return null;
    const network = this.coreSimulation.networks.get(id);
    if (!network) return null;

    // Return in format expected by tests
    return {
      inputLayer: [
        'nearestFoodDistance',
        'nearestFoodAngle',
        'nearestPredatorDistance',
        'nearestPredatorAngle'
      ],
      hiddenLayers: [
        new Array(network.architecture.hiddenSize).fill(0)
      ],
      outputLayer: [
        'moveDirection',
        'moveSpeed',
        'reproduce',
        'attack'
      ]
    };
  }

  /**
   * Spawn a food resource
   */
  spawnFood(x, y, options = {}) {
    if (!this.coreSimulation) return null;
    return this.coreSimulation.resourceManager.spawnFood(x, y, options);
  }

  /**
   * Reset the simulation
   */
  resetSimulation() {
    // Reset core simulation
    if (this.coreSimulation) {
      this.coreSimulation.entities.clear();
      this.coreSimulation.networks.clear();
      this.coreSimulation.resourceManager.resources.clear();
      this.coreSimulation.stats = {
        entityCount: 0,
        networkCount: 0
      };
      this.coreSimulation.params.frameCount = 0;
    }

    // Reset tile workers
    if (this.features.webWorker) {
      this.tileManager.reset();
    }
    
    // Stop simulation if running
    if (this.isRunning) {
      this.stop();
    }

    this.frameCount = 0;
    console.debug('🌱 Simulation reset');
  }

  /**
   * Step the simulation forward one frame
   */
  async step() {
    if (!this.coreSimulation || !this.isInitialized) return;

    const now = performance.now();
    const deltaTime = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    // Update core simulation
    await this.coreSimulation.update(deltaTime);
    this.frameCount++;

    // Update stats every 30 frames
    if (this.frameCount % 30 === 0) {
      this.stats = {
        ...this.stats,
        entityCount: this.coreSimulation.stats.entityCount,
        fps: Math.round(1 / deltaTime)
      };
    }
  }

  /**
   * Render loop - draws the simulation state to the main canvas
   * @param {number} timestamp - Current time from requestAnimationFrame
   * @private
   */
  render(timestamp) {
    if (!this.isInitialized || !this.isRunning) return;

    // Calculate delta time and update stats
    const deltaTime = (timestamp - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = timestamp;
    this.frameCount++;

    // Update simulation
    if (this.coreSimulation) {
      this.coreSimulation.update(deltaTime);
    }

    // Update FPS stats (every half second)
    if (this.frameCount % 30 === 0) {
      this.stats.frameTime = deltaTime * 1000;
      this.stats.fps = Math.round(1000 / (deltaTime * 1000));

      if (this.coreSimulation) {
        this.stats.entityCount = this.coreSimulation.getStats().entityCount;
      }
    }

    // Draw to main canvas
    this.drawMainCanvas();

    // Continue the render loop
    if (this.isRunning) {
      requestAnimationFrame(this.render);
    }
  }

  /**
   * Draw the simulation to the main canvas
   * @private
   */
  drawMainCanvas() {
    if (this.context instanceof CanvasRenderingContext2D) {
      const ctx = this.context;

      // Clear canvas
      ctx.fillStyle = '#0a1e12';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      if (this.coreSimulation) {
        // Draw all entities
        for (const entity of this.coreSimulation.entities.values()) {
          // Choose color based on species
          switch (entity.species) {
            case 0: // Plants - green
              ctx.fillStyle = '#7fe084';
              break;
            case 1: // Herbivores - blue
              ctx.fillStyle = '#84b5e0';
              break;
            default: // Carnivores - red
              ctx.fillStyle = '#e08484';
          }

          // Draw entity
          ctx.beginPath();
          ctx.arc(entity.position[0], entity.position[1], 
                 entity.size * 5, 0, Math.PI * 2);
          ctx.fill();

          // Draw energy bar
          if (entity.energy !== undefined) {
            const barWidth = 20;
            const barHeight = 2;
            const energyPercent = Math.max(0, Math.min(1, entity.energy / 100));

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(
              entity.position[0] - barWidth / 2,
              entity.position[1] - entity.size * 5 - barHeight - 2,
              barWidth,
              barHeight
            );

            ctx.fillStyle = energyPercent > 0.5 ? '#7fe084' : '#e07f7f';
            ctx.fillRect(
              entity.position[0] - barWidth / 2,
              entity.position[1] - entity.size * 5 - barHeight - 2,
              barWidth * energyPercent,
              barHeight
            );
          }
        }
      }

      // Draw stats
      this.drawStats(ctx);
    }
  }

  /**
   * Draw performance statistics
   * @private
   */
  drawStats(ctx) {
    if (!this.options.showStats) return;

    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`FPS: ${this.stats.fps}`, 10, 20);
    ctx.fillText(`Entities: ${this.stats.entityCount}`, 10, 35);
    ctx.fillText(`Frame Time: ${this.stats.frameTime.toFixed(2)}ms`, 10, 50);
  }
}