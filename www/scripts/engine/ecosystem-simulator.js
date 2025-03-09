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

    // Rendering elements
    this.container = null;
    this.canvas = null;
    this.context = null;

    // WebGPU resources
    this.gpuManager = new WebGPUManager();
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
      document.addEventListener('DOMContentLoaded', () => {return this.initialize()});
    } else {
      this.initialize();
    }
  }

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
      if (WebGPUManager.isWebGPUSupported()) {
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

      // Configure WebGPU context if supported
      if (this.features.webGPU) {
        this.context = this.gpuManager.configureCanvas(this.canvas);
      } else {
        // Fallback to 2D context
        this.context = this.canvas.getContext('2d');
      }

      // Initialize tile manager
      this.tileManager = new TileManager({
        worldWidth: this.options.width,
        worldHeight: this.options.height,
        tileSize: this.options.tileSize,
        maxEntitiesPerTile: this.options.maxEntitiesPerTile,
        gpuManager: this.gpuManager
      });

      // Initialize tile system
      await this.tileManager.initialize();

      // Mark as initialized
      this.isInitialized = true;

      // Add event listeners for UI controls if they exist
      this.setupEventListeners();

      // Auto-start if configured
      if (this.options.autoStart) {
        this.start();
      }

      console.debug('🌎 EcosystemSimulator initialized successfully');
      return true;
    } catch (error) {
      console.error('EcosystemSimulator initialization failed:', error);
      this.showFallbackContent(error.message);
      return false;
    }
  }

  /**
   * Set up event listeners for simulator controls
   * @private
   */
  setupEventListeners() {
    // Find UI control elements if they exist
    const spawnButton = document.getElementById('spawn-life');
    const toggleButton = document.getElementById('toggle-simulation');
    const resetButton = document.getElementById('reset-preview');

    // Set up spawn button
    if (spawnButton) {
      spawnButton.disabled = false;
      spawnButton.addEventListener('click', () => {
        this.spawnRandomEntities(50);
      });
    }

    // Set up toggle button
    if (toggleButton) {
      toggleButton.disabled = false;
      toggleButton.addEventListener('click', () => {
        this.toggleSimulation();
      });
    }

    // Set up reset button
    if (resetButton) {
      resetButton.disabled = false;
      resetButton.addEventListener('click', () => {
        this.reset();
      });
    }
  }

  /**
   * Display fallback content if initialization fails
   * @param {string} errorMessage - Error message to display
   * @private
   */
  showFallbackContent(errorMessage) {
    if (!this.container) {return;}

    const fallbackHtml = `
      <div class="canvas-placeholder">
        <div class="error-message">
          <h3>Initialization Failed</h3>
          <p>${errorMessage}</p>
          <p>Your browser might not support the required features.</p>
        </div>
      </div>
    `;

    this.container.innerHTML = fallbackHtml;
  }

  /**
   * Start the simulation
   */
  start() {
    if (!this.isInitialized) {return;}
    if (this.isRunning) {return;}

    // Start tile workers
    this.tileManager.start();

    // Start rendering loop
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this.render);

    console.debug('🌎 Simulation started');
  }

  /**
   * Stop the simulation
   */
  stop() {
    if (!this.isInitialized) {return;}
    if (!this.isRunning) {return;}

    // Stop tile workers
    this.tileManager.stop();

    // Stop rendering loop
    this.isRunning = false;

    console.debug('🌎 Simulation stopped');
  }

  /**
   * Toggle simulation between running and stopped states
   */
  toggleSimulation() {
    if (this.isRunning) {
      this.stop();
    } else {
      this.start();
    }
  }

  /**
   * Reset the simulation
   */
  reset() {
    if (!this.isInitialized) {return;}

    // Stop simulation if running
    const wasRunning = this.isRunning;
    if (wasRunning) {
      this.stop();
    }

    // Reset tile system
    this.tileManager.reset();

    // Reset statistics
    this.stats.entityCount = 0;
    this.frameCount = 0;

    // Clear main canvas
    if (this.context instanceof CanvasRenderingContext2D) {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    console.debug('🌎 Simulation reset');

    // Restart if it was running
    if (wasRunning) {
      this.start();
    }
  }

  /**
   * Render loop - draws the simulation state to the main canvas
   * @param {number} timestamp - Current time from requestAnimationFrame
   * @private
   */
  render(timestamp) {
    if (!this.isInitialized || !this.isRunning) {return;}

    // Calculate delta time and update stats
    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    this.frameCount++;

    // Update FPS stats (every half second)
    if (this.frameCount % 30 === 0) {
      this.stats.frameTime = deltaTime;
      this.stats.fps = Math.round(1000 / deltaTime);

      // Get entity stats from tile manager
      const tileStats = this.tileManager.getStats();
      this.stats.entityCount = tileStats.totalEntities;
    }

    // Draw to main canvas
    this.drawMainCanvas();

    // Continue the render loop
    requestAnimationFrame(this.render);
  }

  /**
   * Draw the simulation to the main canvas
   * @private
   */
  drawMainCanvas() {
    // If we have WebGPU rendering, we'll implement it here later
    // For now, we'll just use 2D canvas rendering as a fallback

    if (this.context instanceof CanvasRenderingContext2D) {
      const ctx = this.context;

      // Clear canvas
      ctx.fillStyle = '#0a1e12';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw tiles
      for (const [id, tile] of this.tileManager.tiles) {
        // Draw tile boundaries
        ctx.strokeStyle = 'rgba(127, 224, 132, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tile.left, tile.top, tile.width, tile.height);

        // Draw entities in this tile
        for (const entity of tile.entities) {
          // Choose color based on species
          switch (entity.species % 3) {
            case 0: // Plants (green)
              ctx.fillStyle = 'rgba(32, 224, 32, 0.8)';
              break;
            case 1: // Herbivores (blue)
              ctx.fillStyle = 'rgba(32, 32, 224, 0.8)';
              break;
            default: // Carnivores (red)
              ctx.fillStyle = 'rgba(224, 32, 32, 0.8)';
              break;
          }

          // Draw entity
          ctx.beginPath();
          ctx.arc(entity.x, entity.y, entity.size, 0, Math.PI * 2);
          ctx.fill();

          // Draw energy bar if energy is defined
          if (entity.energy !== undefined) {
            const barWidth = entity.size * 2;
            const barHeight = 2;
            const energyPercent = Math.max(0, Math.min(1, entity.energy / 100));

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(
              entity.x - barWidth / 2,
              entity.y - entity.size - barHeight - 2,
              barWidth,
              barHeight
            );

            ctx.fillStyle = energyPercent > 0.5 ? '#7fe084' : '#e07f7f';
            ctx.fillRect(
              entity.x - barWidth / 2,
              entity.y - entity.size - barHeight - 2,
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
   * Draw statistics overlay
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @private
   */
  drawStats(ctx) {
    ctx.fillStyle = 'rgba(10, 30, 18, 0.7)';
    ctx.fillRect(10, 10, 180, 70);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#7fe084';
    ctx.fillText(`FPS: ${this.stats.fps}`, 20, 30);
    ctx.fillText(`Entities: ${this.stats.entityCount}`, 20, 50);
    ctx.fillText(`Frame: ${this.frameCount}`, 20, 70);
  }

  /**
   * Spawn a single entity
   * @param {Object} options - Entity options
   * @returns {Object} - The created entity
   */
  spawnEntity(options) {
    if (!this.isInitialized) {return null;}
    return this.tileManager.spawnEntity(options);
  }

  /**
   * Spawn multiple random entities
   * @param {number} count - Number of entities to spawn
   */
  spawnRandomEntities(count = 10) {
    if (!this.isInitialized) {return;}

    // Spawn 60% plants, 30% herbivores, 10% carnivores
    const plantCount = Math.floor(count * 0.6);
    const herbivoreCount = Math.floor(count * 0.3);
    const carnivoreCount = count - plantCount - herbivoreCount;

    // Spawn plants
    this.tileManager.spawnEntities(plantCount, {
      species: 0,
      energy: 100,
      size: 3,
      vx: 0,
      vy: 0 // Plants don't move
    });

    // Spawn herbivores
    this.tileManager.spawnEntities(herbivoreCount, {
      species: 1,
      energy: 80,
      size: 5
    });

    // Spawn carnivores
    this.tileManager.spawnEntities(carnivoreCount, {
      species: 2,
      energy: 60,
      size: 7
    });

    console.debug(`🌎 Spawned ${count} entities (${plantCount} plants, ${herbivoreCount} herbivores, ${carnivoreCount} carnivores)`);
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.isRunning) {
      this.stop();
    }

    if (this.tileManager) {
      this.tileManager.destroy();
    }

    if (this.gpuManager) {
      this.gpuManager.destroy();
    }

    this.isInitialized = false;
    console.debug('🌎 EcosystemSimulator destroyed');
  }
}