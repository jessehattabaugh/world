/**
 * Slippy Map Demo
 *
 * This demonstration shows how to:
 * 1. Initialize a slippy map-style grid system using the TileManager
 * 2. Set up dynamic loading/unloading of tiles as the viewport moves
 * 3. Manage Web Workers (one per tile) using Comlink for easy communication
 * 4. Initialize OffscreenCanvas for each tile's independent rendering
 * 5. Handle entity spawning and management across tile boundaries
 * 6. Implement interaction with the map through panning and zooming
 */
import { TileManager } from './engine/tile-manager.js';

class SlippyMapDemo {
	/**
	 * Initialize the slippy map demo
	 * @param {Object} options - Configuration options
	 * @param {string} options.canvasId - ID of the canvas element to render to
	 * @param {number} options.worldWidth - Total width of the virtual world
	 * @param {number} options.worldHeight - Total height of the virtual world
	 * @param {number} [options.tileSize=256] - Size of each tile in pixels
	 * @param {number} [options.maxWorkers] - Maximum number of Web Workers to use
	 */
	constructor(options) {
		// Demo configuration
		this.options = {
			canvasId: options.canvasId || 'map-canvas',
			worldWidth: options.worldWidth || 4096,
			worldHeight: options.worldHeight || 4096,
			tileSize: options.tileSize || 256,
			maxWorkers: options.maxWorkers || navigator.hardwareConcurrency || 4,
		};

		// Map elements
		this.canvas = document.getElementById(this.options.canvasId);
		this.ctx = null;
		this.tileManager = null;

		// Interaction state
		this.isPanning = false;
		this.lastMousePosition = { x: 0, y: 0 };

		// Stats and metrics
		this.stats = {
			fps: 0,
			frameTime: 0,
			visibleTiles: 0,
			loadedTiles: 0,
			entityCount: 0,
		};

		// Timestamp tracking
		this.lastFrameTime = performance.now();
		this.frameCount = 0;
		this.fpsUpdateInterval = 500; // Update FPS every 500ms
		this.lastFpsUpdate = 0;

		// Entity management
		this.entities = new Map(); // entityId -> entity

		// Demo state
		this.isInitialized = false;
		this.isRunning = false;

		// Bind methods that will be used as event handlers
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.onWheel = this.onWheel.bind(this);
		this.onResize = this.onResize.bind(this);
		this.animationFrame = this.animationFrame.bind(this);

		// Status message display
		this.statusElement =
			document.getElementById('status-message') || this.createStatusElement();
	}

	/**
	 * Initialize the demo
	 * @returns {Promise<boolean>} Whether initialization was successful
	 */
	async initialize() {
		try {
			this.updateStatus('Initializing slippy map demo...');

			// Check if the browser supports required features
			if (!this.checkBrowserSupport()) {
				this.updateStatus(
					"Your browser doesn't support required features (Web Workers, OffscreenCanvas)",
					true,
				);
				return false;
			}

			// Set up the canvas
			if (!this.setupCanvas()) {
				this.updateStatus('Failed to set up canvas', true);
				return false;
			}

			// Create and initialize the TileManager
			this.tileManager = new TileManager({
				width: this.options.worldWidth,
				height: this.options.worldHeight,
				tileSize: this.options.tileSize,
				maxWorkers: this.options.maxWorkers,
				bufferZone: 1, // Keep 1 extra tile loaded in each direction
				viewport: {
					x: 0,
					y: 0,
					width: this.canvas.width,
					height: this.canvas.height,
					zoom: 1,
				},
				ctx: this.ctx,
				onTileUpdate: (tileId) => {
					// Optional callback when a tile is updated
					console.debug(`Chunk ${tileId} was updated`);
				},
			});

			// Initialize the tile manager
			const initSuccess = await this.tileManager.initialize();
			if (!initSuccess) {
				this.updateStatus('Failed to initialize tile manager', true);
				return false;
			}

			// Set up event listeners for interaction
			this.setupEventListeners();

			this.isInitialized = true;
			this.updateStatus('Slippy map initialized successfully! ✓');

			// Start the animation loop
			this.start();

			return true;
		} catch (error) {
			console.error('Error initializing demo:', error);
			this.updateStatus(`Initialization error: ${error.message}`, true);
			return false;
		}
	}

	/**
	 * Check if the browser supports required features
	 * @returns {boolean} Whether the browser has required support
	 * @private
	 */
	checkBrowserSupport() {
		// Check for Web Workers
		if (!window.Worker) {
			console.error('Web Workers not supported');
			return false;
		}

		// Check for OffscreenCanvas
		if (!window.OffscreenCanvas) {
			console.error('OffscreenCanvas not supported');
			return false;
		}

		return true;
	}

	/**
	 * Set up the canvas element
	 * @returns {boolean} Whether setup was successful
	 * @private
	 */
	setupCanvas() {
		if (!this.canvas) {
			console.error(`Canvas element with ID "${this.options.canvasId}" not found`);
			return false;
		}

		// Set canvas size to match its display size
		this.resizeCanvas();

		// Get rendering context
		this.ctx = this.canvas.getContext('2d', {
			alpha: false,
			desynchronized: true,
		});

		if (!this.ctx) {
			console.error('Could not get canvas context');
			return false;
		}

		return true;
	}

	/**
	 * Set up event listeners for user interaction
	 * @private
	 */
	setupEventListeners() {
		// Mouse/touch events for panning
		this.canvas.addEventListener('mousedown', this.onMouseDown);
		this.canvas.addEventListener('mousemove', this.onMouseMove);
		window.addEventListener('mouseup', this.onMouseUp);

		// Wheel events for zooming
		this.canvas.addEventListener('wheel', this.onWheel, { passive: false });

		// Window resize
		window.addEventListener('resize', this.onResize);

		// Touch events for mobile
		this.canvas.addEventListener('touchstart', (e) => {
			e.preventDefault();
			if (e.touches.length === 1) {
				const touch = e.touches[0];
				this.onMouseDown({
					clientX: touch.clientX,
					clientY: touch.clientY,
					button: 0,
				});
			}
		});

		this.canvas.addEventListener('touchmove', (e) => {
			e.preventDefault();
			if (e.touches.length === 1) {
				const touch = e.touches[0];
				this.onMouseMove({
					clientX: touch.clientX,
					clientY: touch.clientY,
				});
			}
		});

		window.addEventListener('touchend', (e) => {
			this.onMouseUp();
		});

		// UI Controls
		this.setupUIControls();
	}

	/**
	 * Set up UI control elements
	 * @private
	 */
	setupUIControls() {
		// Reset view button
		const resetButton = document.getElementById('reset-view');
		if (resetButton) {
			resetButton.addEventListener('click', () => {
				this.resetView();
			});
		}

		// Spawn entity button
		const spawnButton = document.getElementById('spawn-entity');
		if (spawnButton) {
			spawnButton.addEventListener('click', () => {
				this.spawnRandomEntities(10);
			});
		}
	}

	/**
	 * Start the animation loop
	 */
	start() {
		if (!this.isInitialized) {
			console.error('Cannot start demo: not initialized');
			return;
		}

		if (this.isRunning) return;

		this.isRunning = true;
		this.tileManager.start();
		this.lastFrameTime = performance.now();
		requestAnimationFrame(this.animationFrame);

		this.updateStatus('Animation started');
	}

	/**
	 * Stop the animation loop
	 */
	stop() {
		this.isRunning = false;
		this.tileManager?.stop();

		this.updateStatus('Animation stopped');
	}

	/**
	 * Animation frame handler
	 * @param {number} timestamp - Current timestamp
	 * @private
	 */
	animationFrame(timestamp) {
		if (!this.isRunning) return;

		// Calculate FPS
		const elapsed = timestamp - this.lastFrameTime;
		this.lastFrameTime = timestamp;
		this.frameCount++;

		// Update FPS counter every 500ms
		if (timestamp - this.lastFpsUpdate > this.fpsUpdateInterval) {
			this.stats.fps = Math.round(
				(this.frameCount * 1000) / (timestamp - this.lastFpsUpdate),
			);
			this.frameCount = 0;
			this.lastFpsUpdate = timestamp;

			// Update stats display
			this.updateStatsDisplay();
		}

		// Update metrics from tile manager
		const metrics = this.tileManager.getMetrics();
		this.stats.frameTime = metrics.frameTime;
		this.stats.visibleTiles = metrics.visibleTileCount;
		this.stats.loadedTiles = metrics.loadedTileCount;

		// Request next frame
		requestAnimationFrame(this.animationFrame);
	}

	/**
	 * Handle mouse down event (start panning)
	 * @param {MouseEvent} event - Mouse event
	 * @private
	 */
	onMouseDown(event) {
		if (event.button !== 0) return; // Only left mouse button

		this.isPanning = true;
		this.lastMousePosition = {
			x: event.clientX,
			y: event.clientY,
		};

		this.canvas.style.cursor = 'grabbing';
	}

	/**
	 * Handle mouse move event (pan if dragging)
	 * @param {MouseEvent} event - Mouse event
	 * @private
	 */
	onMouseMove(event) {
		if (!this.isPanning) return;

		const dx = event.clientX - this.lastMousePosition.x;
		const dy = event.clientY - this.lastMousePosition.y;

		// Pan the viewport in the opposite direction of the drag
		this.tileManager.panViewport(-dx, -dy);

		// Update last position
		this.lastMousePosition = {
			x: event.clientX,
			y: event.clientY,
		};
	}

	/**
	 * Handle mouse up event (end panning)
	 * @private
	 */
	onMouseUp() {
		this.isPanning = false;
		this.canvas.style.cursor = 'grab';
	}

	/**
	 * Handle mouse wheel event (zooming)
	 * @param {WheelEvent} event - Wheel event
	 * @private
	 */
	onWheel(event) {
		event.preventDefault();

		// Calculate zoom factor (slower zoom for smoother experience)
		const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;

		// Get the position of the cursor relative to the canvas
		const rect = this.canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		// Zoom around the cursor position
		this.tileManager.zoomViewport(zoomFactor, x, y);
	}

	/**
	 * Handle window resize event
	 * @private
	 */
	onResize() {
		// Update canvas size
		this.resizeCanvas();

		// Update viewport dimensions
		if (this.tileManager) {
			this.tileManager.setViewport({
				width: this.canvas.width,
				height: this.canvas.height,
			});
		}
	}

	/**
	 * Resize the canvas to match its display size
	 * @private
	 */
	resizeCanvas() {
		if (!this.canvas) return;

		// Get the desired size from the container
		const displayWidth = this.canvas.clientWidth;
		const displayHeight = this.canvas.clientHeight;

		// Check if the canvas is not the same size
		if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
			// Make the canvas the same size
			this.canvas.width = displayWidth;
			this.canvas.height = displayHeight;
		}
	}

	/**
	 * Reset the view to the initial state
	 */
	resetView() {
		if (!this.tileManager) return;

		this.tileManager.setViewport({
			x: 0,
			y: 0,
			zoom: 1,
		});

		this.updateStatus('View reset to origin');
	}

	/**
	 * Spawn random entities for demonstration
	 * @param {number} count - Number of entities to spawn
	 */
	spawnRandomEntities(count = 10) {
		if (!this.tileManager) return;

		const viewport = this.tileManager.viewport;
		const spawned = [];

		for (let i = 0; i < count; i++) {
			// Determine if this should be a lifeform (80% chance)
			const isLifeform = Math.random() < 0.8;

			// Create entity within the current viewport
			const x = viewport.x + Math.random() * viewport.width;
			const y = viewport.y + Math.random() * viewport.height;

			let entityOptions;

			if (isLifeform) {
				// Random lifeform properties
				const species = Math.floor(Math.random() * 3); // 0: plant, 1: herbivore, 2: carnivore

				entityOptions = {
					type: 'lifeform',
					position: { x, y },
					velocity: {
						x: (Math.random() - 0.5) * 0.5,
						y: (Math.random() - 0.5) * 0.5,
					},
					species,
					energy: 50 + Math.random() * 50,
					size: 3 + Math.random() * 5,
				};
			} else {
				// Generic entity
				entityOptions = {
					position: { x, y },
					velocity: {
						x: (Math.random() - 0.5) * 0.2,
						y: (Math.random() - 0.5) * 0.2,
					},
					color: `hsl(${Math.random() * 360}, 70%, 50%)`,
					size: 2 + Math.random() * 6,
				};
			}

			// Spawn the entity
			const entityId = this.tileManager.spawnEntity(entityOptions);
			if (entityId) {
				spawned.push(entityId);
			}
		}

		this.updateStatus(`Spawned ${spawned.length} entities`);
		return spawned;
	}

	/**
	 * Update the status message display
	 * @param {string} message - Status message to display
	 * @param {boolean} [isError=false] - Whether this is an error message
	 * @private
	 */
	updateStatus(message, isError = false) {
		if (!this.statusElement) return;

		this.statusElement.textContent = message;
		this.statusElement.className = isError ? 'error' : 'success';

		console[isError ? 'error' : 'log'](`[SlippyMap] ${message}`);
	}

	/**
	 * Update the stats display
	 * @private
	 */
	updateStatsDisplay() {
		const statsElement = document.getElementById('stats-display');
		if (!statsElement) return;

		statsElement.innerHTML = `
      <div>FPS: ${this.stats.fps}</div>
      <div>Frame Time: ${this.stats.frameTime.toFixed(1)}ms</div>
      <div>Visible Chunks: ${this.stats.visibleTiles}</div>
      <div>Loaded Chunks: ${this.stats.loadedTiles}</div>
    `;
	}

	/**
	 * Create a status element if it doesn't exist
	 * @returns {HTMLElement} The status element
	 * @private
	 */
	createStatusElement() {
		const statusElement = document.createElement('div');
		statusElement.id = 'status-message';
		statusElement.style.cssText = `
      position: absolute;
      bottom: 10px;
      left: 10px;
      padding: 5px 10px;
      background-color: rgba(0,0,0,0.7);
      color: white;
      font-family: monospace;
      border-radius: 4px;
      pointer-events: none;
    `;
		document.body.appendChild(statusElement);
		return statusElement;
	}

	/**
	 * Clean up resources when the demo is no longer needed
	 */
	dispose() {
		this.stop();

		// Remove event listeners
		this.canvas.removeEventListener('mousedown', this.onMouseDown);
		this.canvas.removeEventListener('mousemove', this.onMouseMove);
		window.removeEventListener('mouseup', this.onMouseUp);
		this.canvas.removeEventListener('wheel', this.onWheel);
		window.removeEventListener('resize', this.onResize);

		// Dispose of the tile manager
		if (this.tileManager) {
			this.tileManager.dispose();
			this.tileManager = null;
		}

		this.isInitialized = false;
		this.updateStatus('Demo disposed');
	}
}

// Export the demo class
export { SlippyMapDemo };

// Auto-initialize if the script is loaded directly
document.addEventListener('DOMContentLoaded', () => {
	// Check if we should auto-initialize
	const mapCanvas = document.getElementById('map-canvas');
	if (mapCanvas && mapCanvas.dataset.autoInit !== 'false') {
		console.log('Auto-initializing SlippyMapDemo');

		const demo = new SlippyMapDemo({
			canvasId: 'map-canvas',
			worldWidth: parseInt(mapCanvas.dataset.worldWidth || 4096),
			worldHeight: parseInt(mapCanvas.dataset.worldHeight || 4096),
			tileSize: parseInt(mapCanvas.dataset.tileSize || 256),
		});

		demo.initialize().then((success) => {
			if (success) {
				// Make the demo accessible globally
				window.slippyMapDemo = demo;
			}
		});
	}
});
