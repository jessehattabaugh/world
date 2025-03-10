/**
 * SimulationController - Manages WebGPU ecosystem simulation
 *
 * This class handles:
 * 1. Creating and managing chunk workers
 * 2. Coordinating the simulation across multiple chunks
 * 3. Providing a high-level API for the UI to control the simulation
 * 4. Tracking entities and statistics
 */

// Constants for simulation
const WORKER_SCRIPT = '/scripts/engine/workers/chunk-worker.js';
const DEFAULT_CHUNK_SIZE = 256;
const DEFAULT_WORLD_SIZE = 1024;

/**
 * Main controller for the ecosystem simulation
 */
export class SimulationController {
	/**
	 * Create a new simulation controller
	 * @param {HTMLCanvasElement} canvas - Main display canvas
	 * @param {Object} options - Configuration options
	 */
	constructor(canvas, options = {}) {
		// Canvas and rendering
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');

		// Configuration
		this.options = {
			worldWidth: options.worldWidth || DEFAULT_WORLD_SIZE,
			worldHeight: options.worldHeight || DEFAULT_WORLD_SIZE,
			chunkSize: options.chunkSize || DEFAULT_CHUNK_SIZE,
			maxWorkers: options.maxWorkers || navigator.hardwareConcurrency || 4,
			...options,
		};

		// Status tracking
		this.initialized = false;
		this.running = false;
		this.renderMode = 'normal'; // 'normal', 'debug', 'energy', etc.

		// Workers
		this.workers = [];
		this.workerCount = 0;
		this.workersInitialized = false;

		// Chunks
		this.chunks = new Map(); // Map of chunkId -> chunk data
		this.chunkGrid = []; // 2D grid of chunks for spatial organization

		// Entities
		this.entityMap = new Map(); // Map of entityId -> entity data
		this.entityHistory = new Map(); // For tracking movement

		// Performance tracking
		this.frameCount = 0;
		this.lastFrameTime = 0;
		this.frameTimes = [];
		this.fps = 0;

		// Bind methods that will be used as callbacks
		this._handleWorkerMessage = this._handleWorkerMessage.bind(this);
		this._renderLoop = this._renderLoop.bind(this);
	}

	/**
	 * Initialize the simulation environment
	 */
	async initialize() {
		// Set up canvas size
		this._resizeCanvas();
		window.addEventListener('resize', () => {return this._resizeCanvas()});

		// Check for feature support
		this.features = {
			webWorkers: typeof Worker !== 'undefined',
			webGPU: 'gpu' in navigator,
			offscreenCanvas: 'OffscreenCanvas' in window,
		};

		// Calculate the grid dimensions based on world and chunk size
		const gridWidth = Math.ceil(this.options.worldWidth / this.options.chunkSize);
		const gridHeight = Math.ceil(this.options.worldHeight / this.options.chunkSize);

		// Create the grid
		this.chunkGrid = Array(gridHeight)
			.fill()
			.map(() => {return Array(gridWidth).fill(null)});

		// Initialize workers
		await this._initializeWorkers();

		// Create chunks and assign them to workers
		this._createChunks();

		// Start the render loop
		requestAnimationFrame(this._renderLoop);

		// Mark as initialized
		this.initialized = true;

		return this.initialized;
	}

	/**
	 * Start the simulation
	 */
	start() {
		if (!this.initialized) {
			console.error('Cannot start: simulation not initialized');
			return false;
		}

		this.running = true;

		// Send start message to all workers
		this.workers.forEach((worker) => {
			worker.postMessage({
				type: 'control',
				action: 'start',
			});
		});

		return true;
	}

	/**
	 * Pause the simulation
	 */
	pause() {
		this.running = false;

		// Send stop message to all workers
		this.workers.forEach((worker) => {
			worker.postMessage({
				type: 'control',
				action: 'stop',
			});
		});
	}

	/**
	 * Reset the simulation
	 */
	reset() {
		// Clear entity tracking
		this.entityMap.clear();
		this.entityHistory.clear();

		// Reset all workers
		this.workers.forEach((worker) => {
			worker.postMessage({
				type: 'control',
				action: 'reset',
			});
		});

		this.frameCount = 0;
	}

	/**
	 * Spawn random entities throughout the world
	 * @param {number} count - Number of entities to spawn
	 */
	spawnRandomEntities(count = 10) {
		for (let i = 0; i < count; i++) {
			// Random position within world bounds
			const x = Math.random() * this.options.worldWidth;
			const y = Math.random() * this.options.worldHeight;

			// Random species (0: plant, 1: herbivore, 2: carnivore)
			const species = Math.floor(Math.random() * 3);

			// Create entity with appropriate parameters based on species
			const entity = this._createEntity(x, y, species);

			// Spawn the entity
			this._spawnEntityInChunk(entity);
		}
	}

	/**
	 * Spawn entities of a specific type
	 * @param {number} speciesType - Species type (0: plant, 1: herbivore, 2: carnivore)
	 * @param {number} count - Number of entities to spawn
	 */
	spawnEntitiesByType(speciesType, count = 5) {
		for (let i = 0; i < count; i++) {
			// Random position within world bounds
			const x = Math.random() * this.options.worldWidth;
			const y = Math.random() * this.options.worldHeight;

			// Create entity with appropriate parameters based on species
			const entity = this._createEntity(x, y, speciesType);

			// Spawn the entity
			this._spawnEntityInChunk(entity);
		}
	}

	/**
	 * Toggle between different rendering modes
	 */
	toggleRenderMode() {
		const modes = ['normal', 'debug', 'energy', 'species'];
		const currentIndex = modes.indexOf(this.renderMode);
		this.renderMode = modes[(currentIndex + 1) % modes.length];

		// TODO: Update worker rendering modes when implemented
	}

	/**
	 * Get the number of chunks that are ready
	 * @returns {number} Number of ready chunks
	 */
	getReadyChunkCount() {
		let readyChunks = 0;
		for (const chunk of this.chunks.values()) {
			if (chunk.ready) {
				readyChunks++;
			}
		}
		return readyChunks;
	}

	/**
	 * Get the total count of entities across all chunks
	 * @returns {number} Total entity count
	 */
	getTotalEntityCount() {
		return this.entityMap.size;
	}

	/**
	 * Get the current FPS
	 * @returns {number} Current frames per second
	 */
	getCurrentFPS() {
		return this.fps;
	}

	/**
	 * Check if entities have moved from their original positions
	 * Used for testing movement simulation
	 * @returns {boolean} True if entities have moved
	 */
	haveEntitiesMoved() {
		// If we don't have both current and history data, return false
		if (this.entityMap.size === 0 || this.entityHistory.size === 0) {
			return false;
		}

		// Check if any entity has moved from its original position
		for (const [entityId, entity] of this.entityMap.entries()) {
			const history = this.entityHistory.get(entityId);

			// If we have history for this entity
			if (history) {
				const originalX = history.x;
				const originalY = history.y;

				// Check if position has changed significantly
				if (Math.abs(entity.x - originalX) > 0.1 || Math.abs(entity.y - originalY) > 0.1) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Cleanup resources when destroying the controller
	 */
	dispose() {
		// Stop the simulation
		this.pause();

		// Terminate all workers
		this.workers.forEach((worker) => {return worker.terminate()});
		this.workers = [];

		// Clear all data structures
		this.chunks.clear();
		this.entityMap.clear();
		this.entityHistory.clear();
		this.chunkGrid = [];
	}

	//-------------------------------------------------------------------------
	// Private methods
	//-------------------------------------------------------------------------

	/**
	 * Initialize web workers for distributed processing
	 * @private
	 */
	async _initializeWorkers() {
		const workerCount = Math.min(this.options.maxWorkers, navigator.hardwareConcurrency || 4);
		this.workerCount = workerCount;

		// Create workers
		for (let i = 0; i < workerCount; i++) {
			try {
				// Create the worker
				const worker = new Worker(WORKER_SCRIPT, { type: 'module' });

				// Set up message handler
				worker.onmessage = this._handleWorkerMessage;

				// Store worker information
				this.workers.push({
					worker,
					id: i,
					status: 'initializing',
					chunkCount: 0,
					entityCount: 0,
				});

				// Initialize the worker
				worker.postMessage({
					type: 'init',
					workerId: i,
					features: this.features,
				});
			} catch (error) {
				console.error(`Failed to create worker ${i}:`, error);
			}
		}

		// Wait for all workers to initialize
		await new Promise((resolve) => {
			const checkWorkers = () => {
				const allInitialized = this.workers.every(
					(w) => {return w.status === 'ready' || w.status === 'gpu-ready'},
				);
				if (allInitialized || this.workers.some((w) => {return w.status === 'failed'})) {
					this.workersInitialized = allInitialized;
					resolve();
				} else {
					setTimeout(checkWorkers, 100);
				}
			};

			checkWorkers();
		});

		return this.workers.length > 0;
	}

	/**
	 * Create and assign chunks to workers
	 * @private
	 */
	_createChunks() {
		const { worldWidth, worldHeight, chunkSize } = this.options;
		const gridWidth = Math.ceil(worldWidth / chunkSize);
		const gridHeight = Math.ceil(worldHeight / chunkSize);

		let chunkIndex = 0;

		// Create chunks grid
		for (let y = 0; y < gridHeight; y++) {
			for (let x = 0; x < gridWidth; x++) {
				// Calculate actual chunk dimensions (edge chunks may be smaller)
				const width = Math.min(chunkSize, worldWidth - x * chunkSize);
				const height = Math.min(chunkSize, worldHeight - y * chunkSize);

				// Skip if dimensions are invalid
				if (width <= 0 || height <= 0) {continue;}

				// Create chunk information
				const chunkId = `chunk-${x}-${y}`;
				const chunkInfo = {
					id: chunkId,
					x: x * chunkSize,
					y: y * chunkSize,
					width,
					height,
					gridX: x,
					gridY: y,
				};

				// Store in our data structures
				this.chunks.set(chunkId, {
					...chunkInfo,
					entities: [],
					ready: false,
					worker: null,
					workerId: -1,
				});

				this.chunkGrid[y][x] = chunkId;

				// Assign to a worker (round-robin)
				const workerIndex = chunkIndex % this.workers.length;
				this._assignChunkToWorker(chunkId, workerIndex);

				chunkIndex++;
			}
		}
	}

	/**
	 * Assign a chunk to a specific worker
	 * @param {string} chunkId - ID of the chunk to assign
	 * @param {number} workerIndex - Index of the worker
	 * @private
	 */
	_assignChunkToWorker(chunkId, workerIndex) {
		const chunk = this.chunks.get(chunkId);
		if (!chunk) {return;}

		const workerInfo = this.workers[workerIndex];
		if (!workerInfo) {return;}

		const { worker, id } = workerInfo;

		// Update our records
		chunk.worker = worker;
		chunk.workerId = id;
		workerInfo.chunkCount++;

		// Create an OffscreenCanvas for this chunk if supported
		let canvas = null;
		if (this.features.offscreenCanvas) {
			canvas = new OffscreenCanvas(chunk.width, chunk.height);
		}

		// Send the assignment to the worker
		worker.postMessage(
			{
				type: 'assignChunk',
				chunkId: chunk.id,
				chunkInfo: {
					width: chunk.width,
					height: chunk.height,
					x: chunk.x,
					y: chunk.y,
				},
				canvas,
			},
			canvas ? [canvas] : [],
		);

		// Log the assignment
		console.log(`Assigned ${chunk.id} to worker ${id}`);
	}

	/**
	 * Create an entity with appropriate parameters
	 * @param {number} x - X position
	 * @param {number} y - Y position
	 * @param {number} species - Species type (0: plant, 1: herbivore, 2: carnivore)
	 * @returns {Object} Entity object
	 * @private
	 */
	_createEntity(x, y, species) {
		const entityId = `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		// Base entity properties
		const entity = {
			id: entityId,
			type: 'lifeform',
			x,
			y,
			species,
			energy: 100,
			size: 5 + Math.random() * 5,
		};

		// Add species-specific properties
		switch (species) {
			case 0: // Plants
				entity.energy = 150;
				entity.growthRate = 0.01 + Math.random() * 0.02;
				entity.color = '#7fe084'; // Green
				entity.vx = 0;
				entity.vy = 0;
				break;

			case 1: // Herbivores
				entity.energy = 100;
				entity.speed = 0.5 + Math.random() * 1.0;
				entity.color = '#7f7fe0'; // Blue
				entity.vx = (Math.random() - 0.5) * entity.speed;
				entity.vy = (Math.random() - 0.5) * entity.speed;
				break;

			case 2: // Carnivores
				entity.energy = 120;
				entity.speed = 0.8 + Math.random() * 1.5;
				entity.color = '#e07f7f'; // Red
				entity.vx = (Math.random() - 0.5) * entity.speed;
				entity.vy = (Math.random() - 0.5) * entity.speed;
				break;
		}

		// Store in entity map
		this.entityMap.set(entityId, entity);

		// Store initial position for movement tracking (for testing)
		this.entityHistory.set(entityId, { x, y, created: Date.now() });

		return entity;
	}

	/**
	 * Spawn an entity in the appropriate chunk based on its position
	 * @param {Object} entity - Entity to spawn
	 * @private
	 */
	_spawnEntityInChunk(entity) {
		// Find which chunk this entity belongs to
		const { x, y } = entity;
		const chunkX = Math.floor(x / this.options.chunkSize);
		const chunkY = Math.floor(y / this.options.chunkSize);

		// Make sure we're within grid bounds
		if (chunkY >= this.chunkGrid.length || chunkX >= this.chunkGrid[0].length) {
			console.warn(`Entity position ${x},${y} is outside world bounds`);
			return;
		}

		// Get the chunk ID at this location
		const chunkId = this.chunkGrid[chunkY][chunkX];
		if (!chunkId) {
			console.warn(`No chunk found at grid position ${chunkX},${chunkY}`);
			return;
		}

		const chunk = this.chunks.get(chunkId);
		if (!chunk || !chunk.worker) {
			console.warn(`Chunk ${chunkId} has no assigned worker`);
			return;
		}

		// Add entity to our chunk's entity list
		chunk.entities.push(entity.id);

		// Send spawn message to worker
		chunk.worker.postMessage({
			type: 'spawnEntity',
			chunkId,
			entity: {
				...entity,
				// Convert to local chunk coordinates
				x: entity.x - chunk.x,
				y: entity.y - chunk.y,
			},
		});
	}

	/**
	 * Handle messages from workers
	 * @param {MessageEvent} event - Worker message event
	 * @private
	 */
	_handleWorkerMessage(event) {
		const message = event.data;

		switch (message.type) {
			case 'workerStatus':
				this._handleWorkerStatusUpdate(message);
				break;

			case 'chunkReady':
				this._handleChunkReady(message);
				break;

			case 'chunkUpdate':
				this._handleChunkUpdate(message);
				break;

			default:
				console.log('Unknown message from worker:', message);
		}
	}

	/**
	 * Handle worker status update messages
	 * @param {Object} message - Worker status message
	 * @private
	 */
	_handleWorkerStatusUpdate(message) {
		const { status, workerId } = message;
		const workerInfo = this.workers.find((w) => {return w.id === workerId});

		if (workerInfo) {
			workerInfo.status = status;

			if (status === 'initialized' || status === 'gpu-ready') {
				console.log(
					`Worker ${workerId} initialized with WebGPU: ${status === 'gpu-ready'}`,
				);
			}
		}
	}

	/**
	 * Handle chunk ready messages from workers
	 * @param {Object} message - Chunk ready message
	 * @private
	 */
	_handleChunkReady(message) {
		const { chunkId } = message;
		const chunk = this.chunks.get(chunkId);

		if (chunk) {
			chunk.ready = true;
			console.log(`Chunk ${chunkId} is ready`);
		}
	}

	/**
	 * Handle chunk update messages from workers
	 * @param {Object} message - Chunk update message
	 * @private
	 */
	_handleChunkUpdate(message) {
		const { chunkId, entities, workerId } = message;
		const chunk = this.chunks.get(chunkId);

		if (!chunk) {return;}

		// Update worker entity count
		const workerInfo = this.workers.find((w) => {return w.id === workerId});
		if (workerInfo) {
			workerInfo.entityCount = entities.length;
		}

		// Update entity positions in our entity map
		if (Array.isArray(entities)) {
			entities.forEach((entity) => {
				// Convert from local chunk coordinates to world coordinates
				const worldEntity = {
					...entity,
					x: entity.x + chunk.x,
					y: entity.y + chunk.y,
				};

				// Update our entity map
				if (entity.id) {
					this.entityMap.set(entity.id, worldEntity);
				}
			});
		}
	}

	/**
	 * Main render loop for the simulation display
	 * @param {number} timestamp - Current animation frame timestamp
	 * @private
	 */
	_renderLoop(timestamp) {
		// Calculate delta time and FPS
		if (this.lastFrameTime === 0) {
			this.lastFrameTime = timestamp;
		}

		const deltaTime = timestamp - this.lastFrameTime;
		this.lastFrameTime = timestamp;

		// Track FPS
		this.frameTimes.push(deltaTime);
		if (this.frameTimes.length > 60) {this.frameTimes.shift();}

		const avgFrameTime = this.frameTimes.reduce((a, b) => {return a + b}, 0) / this.frameTimes.length;
		this.fps = 1000 / avgFrameTime;

		// Clear the main canvas
		this.ctx.fillStyle = '#0a1e12';
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		// Draw all entities from our entity map
		this._renderEntities();

		// Draw chunk grid (debug)
		if (this.renderMode === 'debug') {
			this._renderChunkGrid();
		}

		// Draw statistics
		this._renderStats();

		// Increment frame counter
		this.frameCount++;

		// Continue the render loop
		requestAnimationFrame(this._renderLoop);
	}

	/**
	 * Render all entities on the main canvas
	 * @private
	 */
	_renderEntities() {
		for (const entity of this.entityMap.values()) {
			// Skip entities with no energy
			if (entity.energy <= 0) {continue;}

			// Choose color based on species
			let color;
			switch (entity.species) {
				case 0:
					color = '#7fe084'; // Green for plants
					break;
				case 1:
					color = '#7f7fe0'; // Blue for herbivores
					break;
				case 2:
					color = '#e07f7f'; // Red for carnivores
					break;
				default:
					color = '#ffffff'; // White for unknown
			}

			// Override color in certain render modes
			if (this.renderMode === 'energy') {
				// Energy visualization: green (full) to red (empty)
				const energyRatio = Math.max(0, Math.min(1, entity.energy / 100));
				const red = Math.floor(255 * (1 - energyRatio));
				const green = Math.floor(255 * energyRatio);
				color = `rgb(${red}, ${green}, 50)`;
			}

			// Draw entity
			this.ctx.fillStyle = color;
			this.ctx.beginPath();
			this.ctx.arc(entity.x, entity.y, entity.size || 5, 0, Math.PI * 2);
			this.ctx.fill();

			// Draw energy bar above entity if not in energy mode
			if (this.renderMode !== 'energy') {
				const energyPercent = entity.energy / 100;
				const barWidth = entity.size * 2;
				const barHeight = 2;

				this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
				this.ctx.fillRect(
					entity.x - barWidth / 2,
					entity.y - entity.size - barHeight - 2,
					barWidth,
					barHeight,
				);

				this.ctx.fillStyle = energyPercent > 0.5 ? '#7fe084' : '#e07f7f';
				this.ctx.fillRect(
					entity.x - barWidth / 2,
					entity.y - entity.size - barHeight - 2,
					barWidth * energyPercent,
					barHeight,
				);
			}
		}
	}

	/**
	 * Render the chunk grid (for debugging)
	 * @private
	 */
	_renderChunkGrid() {
		this.ctx.strokeStyle = 'rgba(127, 224, 132, 0.3)';
		this.ctx.lineWidth = 1;

		for (const chunk of this.chunks.values()) {
			this.ctx.strokeRect(chunk.x, chunk.y, chunk.width, chunk.height);

			// Draw chunk ID
			this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
			this.ctx.font = '10px monospace';
			this.ctx.fillText(chunk.id, chunk.x + 5, chunk.y + 15);

			// Draw entity count
			this.ctx.fillText(`Entities: ${chunk.entities.length}`, chunk.x + 5, chunk.y + 30);
		}
	}

	/**
	 * Render statistics overlay
	 * @private
	 */
	_renderStats() {
		if (this.renderMode === 'debug') {
			this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
			this.ctx.fillRect(10, 10, 250, 120);

			this.ctx.fillStyle = '#ffffff';
			this.ctx.font = '12px monospace';
			this.ctx.fillText(`FPS: ${this.fps.toFixed(1)}`, 20, 30);
			this.ctx.fillText(`Entities: ${this.entityMap.size}`, 20, 50);
			this.ctx.fillText(`Workers: ${this.workers.length}`, 20, 70);
			this.ctx.fillText(`Chunks: ${this.chunks.size}`, 20, 90);
			this.ctx.fillText(`Frame: ${this.frameCount}`, 20, 110);

			// Population stats by species
			let plants = 0;
			let herbivores = 0;
			let carnivores = 0;

			for (const entity of this.entityMap.values()) {
				if (entity.species === 0) {plants++;}
				else if (entity.species === 1) {herbivores++;}
				else if (entity.species === 2) {carnivores++;}
			}

			this.ctx.fillStyle = '#7fe084';
			this.ctx.fillText(`Plants: ${plants}`, 150, 50);
			this.ctx.fillStyle = '#7f7fe0';
			this.ctx.fillText(`Herbivores: ${herbivores}`, 150, 70);
			this.ctx.fillStyle = '#e07f7f';
			this.ctx.fillText(`Carnivores: ${carnivores}`, 150, 90);
		}
	}

	/**
	 * Resize the canvas to fill its container
	 * @private
	 */
	_resizeCanvas() {
		if (!this.canvas) {return;}

		const container = this.canvas.parentElement;
		if (!container) {return;}

		const { width, height } = container.getBoundingClientRect();

		this.canvas.width = width;
		this.canvas.height = height;

		// Force a redraw
		if (this.ctx) {
			this.ctx.fillStyle = '#0a1e12';
			this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		}
	}
}
