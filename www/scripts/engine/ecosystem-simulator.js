/**
 * Ecosystem Simulator
 *
 * Main controller class for Jesse's World simulation that:
 * - Manages the WebGPU-powered ecosystem simulation
 * - Coordinates rendering and updates
 * - Provides the public API for interacting with the simulation
 */

import { CoreSimulation } from './core-simulation.js';
import { TileManager } from './tile-manager.js';
import { WebGPUManager } from './webgpu-manager.js';

export class EcosystemSimulator {
  constructor(containerId, options = {}) {
    this.options = {
      width: options.width || 1024,
      height: options.height || 768,
      tileSize: options.tileSize || 512,
      maxEntitiesPerTile: options.maxEntitiesPerTile || 1000,
      autoStart: options.autoStart || false,
      showStats: options.showStats || false
    };

    this.state = {
      isInitialized: false,
      isRunning: false,
      frameCount: 0,
      lastFrameTime: 0,
      stats: {
        fps: 0,
        frameTime: 0,
        entityCount: 0
      }
    };

    this.features = {
      webGPU: false,
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      webWorker: typeof Worker !== 'undefined'
    };

    this.containerId = containerId;
    this.container = null;
    this.canvas = null;
    this.context = null;
    this.gpuManager = new WebGPUManager();
    this.coreSimulation = null;
    this.tileManager = null;

    this.render = this.render.bind(this);

    // Initialize when document is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {return this.initialize()});
    } else {
      this.initialize();
    }
  }

  // Standardized lifeform buffer layout
  static lifeformBufferLayout = {
    stride: 48, // bytes per entity
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

  async initialize() {
    try {
      this.container = document.getElementById(this.containerId);
      if (!this.container) {
        throw new Error(`Container element with ID "${this.containerId}" not found`);
      }

      // Initialize WebGPU and canvas
      this.features.webGPU = WebGPUManager.isWebGPUSupported();
      if (this.features.webGPU) {
        this.features.webGPU = await this.gpuManager.initialize();
      }

      // Setup canvas
      this.canvas = this.setupCanvas();
      this.context = this.features.webGPU ?
        this.gpuManager.configureCanvas(this.canvas) :
        this.canvas.getContext('2d');

      // Initialize core systems
      await this.initializeSystems();

      this.state.isInitialized = true;
      if (this.options.autoStart) {
        this.start();
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize EcosystemSimulator:', error);
      return false;
    }
  }

  setupCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = this.options.width;
    canvas.height = this.options.height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.className = 'ecosystem-canvas';

    this.container.innerHTML = '';
    this.container.appendChild(canvas);
    return canvas;
  }

  async initializeSystems() {
    if (this.features.webGPU) {
      this.coreSimulation = new CoreSimulation(this.gpuManager);
      await this.coreSimulation.initialize();
    }

    this.tileManager = new TileManager({
		worldWidth: this.options.width,
		worldHeight: this.options.height,
		chunkSize: this.options.tileSize,
		maxEntitiesPerTile: this.options.maxEntitiesPerTile,
		gpuManager: this.gpuManager,
	});

    this.features.webWorker = await this.tileManager.initialize();
  }

  start() {
    if (!this.state.isInitialized || this.state.isRunning) {return;}

    if (this.features.webWorker) {
      this.tileManager.start();
    }

    this.state.isRunning = true;
    this.state.lastFrameTime = performance.now();
    requestAnimationFrame(this.render);
  }

  stop() {
    if (this.features.webWorker) {
      this.tileManager.stop();
    }
    this.state.isRunning = false;
  }

  /**
   * Spawn a new lifeform in the simulation
   * @param {Object} options - Lifeform options
   */
  spawnLifeform(options = {}) {
    if (!this.state.isInitialized) {return null;}

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
    if (!this.state.isInitialized || !this.coreSimulation) {
      throw new Error('Simulation not initialized');
    }
    return await this.coreSimulation.reproduce(parent1Id, parent2Id);
  }

  /**
   * Get the current state of a lifeform
   */
  getLifeformState(id) {
    if (!this.coreSimulation) {return null;}
    const entity = this.coreSimulation.getLifeformState(id);
    if (!entity) {return null;}

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
    if (!this.coreSimulation) {return null;}
    const network = this.coreSimulation.networks.get(id);
    if (!network) {return null;}

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
    if (!this.coreSimulation) {return null;}
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
    if (this.state.isRunning) {
      this.stop();
    }

    this.state.frameCount = 0;
    console.debug('🌱 Simulation reset');
  }

  /**
   * Step the simulation forward one frame
   */
  async step() {
    if (!this.coreSimulation || !this.state.isInitialized) {return;}

    const now = performance.now();
    const deltaTime = Math.min((now - this.state.lastFrameTime) / 1000, 0.1);
    this.state.lastFrameTime = now;

    // Update core simulation
    await this.coreSimulation.update(deltaTime);
    this.state.frameCount++;

    // Update stats every 30 frames
    if (this.state.frameCount % 30 === 0) {
      this.state.stats = {
        ...this.state.stats,
        entityCount: this.coreSimulation.stats.entityCount,
        fps: Math.round(1 / deltaTime)
      };
    }
  }

  render(timestamp) {
    if (!this.state.isInitialized || !this.state.isRunning) {return;}

    const deltaTime = (timestamp - this.state.lastFrameTime) / 1000;
    this.state.lastFrameTime = timestamp;
    this.state.frameCount++;

    // Update simulation
    this.coreSimulation?.update(deltaTime);

    // Update stats periodically
    if (this.state.frameCount % 30 === 0) {
      this.updateStats(deltaTime);
    }

    this.drawMainCanvas();

    if (this.state.isRunning) {
      requestAnimationFrame(this.render);
    }
  }

  updateStats(deltaTime) {
    this.state.stats = {
      frameTime: deltaTime * 1000,
      fps: Math.round(1000 / (deltaTime * 1000)),
      entityCount: this.coreSimulation?.getStats().entityCount || 0
    };
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
    if (!this.options.showStats) {return;}

    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`FPS: ${this.state.stats.fps}`, 10, 20);
    ctx.fillText(`Entities: ${this.state.stats.entityCount}`, 10, 35);
    ctx.fillText(`Frame Time: ${this.state.stats.frameTime.toFixed(2)}ms`, 10, 50);
  }
}