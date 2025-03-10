/**
 * Chunk Manager
 *
 * Handles distributed processing of the simulation space using Web Workers and OffscreenCanvas
 * Implements a slippy map-style grid system for efficient rendering and computation
 */
import * as Comlink from 'https://unpkg.com/comlink/dist/esm/comlink.mjs';

export class TileManager {
	/**
	 * Creates a new chunk manager
	 * @param {Object} options - Configuration options
	 * @param {number} options.width - Total world width
	 * @param {number} options.height - Total world height
	 * @param {number} [options.chunkSize=256] - Size of each chunk in pixels
	 * @param {number} [options.bufferZone=1] - Number of chunks to keep loaded beyond visible area
	 * @param {number} [options.maxWorkers] - Maximum number of workers to create (defaults to navigator.hardwareConcurrency)
	 * @param {Object} [options.viewport] - Initial viewport settings
	 * @param {CanvasRenderingContext2D} [options.ctx] - Main canvas context for composite rendering
	 * @param {function} [options.onTileUpdate] - Callback when a chunk is updated
	 */
	constructor(options) {
		// World dimensions and configuration
		this.width = options.width;
		this.height = options.height;
		this.chunkSize = options.chunkSize || 256;
		this.bufferZone = options.bufferZone || 1;
		this.workerCount = options.maxWorkers || navigator.hardwareConcurrency || 4;
		this.ctx = options.ctx;
		this.onTileUpdate = options.onTileUpdate || (() => {});

		// Calculate grid dimensions
		this.cols = Math.ceil(this.width / this.chunkSize);
		this.rows = Math.ceil(this.height / this.chunkSize);

		// Track viewport position and dimensions
		this.viewport = options.viewport || {
			x: 0,
			y: 0,
			width: this.ctx ? this.ctx.canvas.width : 800,
			height: this.ctx ? this.ctx.canvas.height : 600,
			zoom: 1,
		};

		// Arrays to store chunks and workers
		/** @type {Map<string, Object>} Map of tileId to chunk objects */
		this.chunks = new Map();
		/** @type {Array<Object>} Array of worker objects with their wrapped Comlink API */
		this.workers = [];

		// Animation state
		this.animationFrameId = null;
		this.isRunning = false;
		this.lastFrameTime = 0;

		// Stats tracking
		this.stats = {
			fps: 0,
			activeChunks: 0,
			totalEntities: 0,
			lastUpdate: Date.now(),
		};

		// Bind methods to preserve context
		this.render = this.render.bind(this);
	}

	/**
	 * Initializes the chunk manager, creates workers and initial chunks
	 * @returns {Promise<boolean>} Whether initialization was successful
	 */
	async initialize() {
		console.debug(
			`🌱 Initializing TileManager with ${this.cols}x${this.rows} grid, ${this.chunkSize}px chunks`,
		);
		console.debug(
			`Initializing with chunk size: ${this.chunkSize} and ${this.workerCount} workers`,
		);

		try {
			// Create workers
			await this.initWorkers();

			// Calculate and initialize visible chunks based on viewport
			await this.updateVisibleChunks();

			console.debug(`🌱 TileManager initialization complete`);
			return true;
		} catch (error) {
			console.error('Failed to initialize TileManager:', error);
			return false;
		}
	}

	/**
	 * Initialize web workers for processing chunks
	 * @private
	 * @returns {Promise<void>}
	 */
	async initWorkers() {
		// Calculate optimal worker count (don't create more workers than chunks)
		const totalChunks = this.cols * this.rows;
		const optimalWorkerCount = Math.min(totalChunks, this.workerCount);

		console.debug(`🌱 Creating ${optimalWorkerCount} workers for ${totalChunks} total chunks`);

		// Create workers
		const workerPromises = [];
		for (let i = 0; i < optimalWorkerCount; i++) {
			workerPromises.push(this.createWorker(i));
		}

		await Promise.all(workerPromises);

		console.debug(`🌱 Created ${this.workers.length} workers`);
	}

	/**
	 * Create a single worker
	 * @private
	 * @param {number} workerId - ID of the worker to create
	 * @returns {Promise<void>}
	 */
	async createWorker(workerId) {
		try {
			// Create a new worker
			const worker = new Worker('/scripts/engine/workers/tile-worker.js', {
				type: 'module',
			});

			// Wrap the worker with Comlink to simplify communication
			const wrappedWorker = Comlink.wrap(worker);

			// Initialize the worker
			await wrappedWorker.init({
				workerId,
				features: {
					webGPU: 'gpu' in navigator,
					offscreenCanvas: 'OffscreenCanvas' in window,
				},
			});

			// Store worker with metadata
			this.workers.push({
				id: workerId,
				worker,
				api: wrappedWorker,
				chunkCount: 0, // Number of chunks assigned to this worker
				chunks: [], // Array of chunk IDs assigned to this worker
			});

			// Listen for messages from this worker
			worker.addEventListener('message', (event) => {
				this.handleWorkerMessage(worker, event);
			});
		} catch (error) {
			console.error(`Failed to initialize worker ${workerId}:`, error);
		}
	}

	/**
	 * Calculate which chunks are visible based on the current viewport
	 * @private
	 * @returns {Array<{col: number, row: number, chunkId: string}>} Array of visible chunk coordinates
	 */
	getVisibleChunkCoords() {
		// Calculate chunk indices that cover the viewport plus buffer zone
		const startCol = Math.floor(this.viewport.x / this.chunkSize) - this.bufferZone;
		const startRow = Math.floor(this.viewport.y / this.chunkSize) - this.bufferZone;

		// Calculate number of chunks that fit in viewport width and height plus buffer
		const chunksWide =
			Math.ceil(this.viewport.width / (this.chunkSize * this.viewport.zoom)) +
			this.bufferZone * 2;
		const chunksHigh =
			Math.ceil(this.viewport.height / (this.chunkSize * this.viewport.zoom)) +
			this.bufferZone * 2;

		const endCol = startCol + chunksWide;
		const endRow = startRow + chunksHigh;

		// Build array of visible chunk coordinates
		const visibleChunks = [];

		for (let col = Math.max(0, startCol); col <= Math.min(this.cols - 1, endCol); col++) {
			for (let row = Math.max(0, startRow); row <= Math.min(this.rows - 1, endRow); row++) {
				visibleChunks.push({
					col,
					row,
					chunkId: `chunk-${col}-${row}`,
				});
			}
		}

		return visibleChunks;
	}

	/**
	 * Update which chunks should be visible and load/unload as needed
	 * @returns {Promise<void>}
	 */
	async updateVisibleChunks() {
		// Get currently visible chunk coordinates
		const visibleChunkCoords = this.getVisibleChunkCoords();

		// Set of currently visible chunk IDs
		const visibleChunkIds = new Set(visibleChunkCoords.map((t) => {return t.chunkId}));

		// Find chunks to unload (chunks that were loaded but are no longer visible)
		const unloadPromises = [];
		for (const [chunkId, chunk] of this.chunks.entries()) {
			if (!visibleChunkIds.has(chunkId)) {
				unloadPromises.push(this.unloadChunk(chunkId));
			}
		}
		await Promise.all(unloadPromises);

		// Load newly visible chunks
		const loadPromises = [];
		for (const chunkCoord of visibleChunkCoords) {
			if (!this.chunks.has(chunkCoord.chunkId)) {
				loadPromises.push(this.loadChunk(chunkCoord));
			}
		}
		await Promise.all(loadPromises);

		// Update stats
		this.stats.activeChunks = this.chunks.size;
	}

	/**
	 * Find the least busy worker for a new chunk assignment
	 * @private
	 * @returns {Object} The selected worker
	 */
	findAvailableWorker() {
		// Find worker with fewest assigned chunks
		return this.workers.reduce(
			(best, current) => {return (current.chunkCount < best.chunkCount ? current : best)},
			this.workers[0],
		);
	}

	/**
	 * Create and load a new chunk
	 * @param {Object} chunkCoord - Chunk coordinate information
	 * @param {number} chunkCoord.col - Column index of the chunk
	 * @param {number} chunkCoord.row - Row index of the chunk
	 * @param {string} chunkCoord.chunkId - Unique ID for the chunk
	 * @returns {Promise<Object>} The created chunk
	 */
	async loadChunk(chunkCoord) {
		const { col, row, chunkId } = chunkCoord;

		// Check if chunk already exists
		if (this.chunks.has(chunkId)) {
			return this.chunks.get(chunkId);
		}

		try {
			// Create chunk object
			const chunk = {
				id: chunkId,
				col,
				row,
				x: col * this.chunkSize,
				y: row * this.chunkSize,
				width: this.chunkSize,
				height: this.chunkSize,
				loaded: false,
				worker: null,
				canvas: null,
				entities: [],
				lastUpdate: 0,
			};

			// Find the least busy worker
			const worker = this.findAvailableWorker();

			// Create an OffscreenCanvas for this chunk if supported
			let canvas = null;
			if ('OffscreenCanvas' in window) {
				canvas = new OffscreenCanvas(this.chunkSize, this.chunkSize);
				// We'll transfer ownership of this canvas to the worker
			}

			// Assign the worker to this chunk
			chunk.worker = worker;
			worker.chunkCount++;
			worker.chunks.push(chunkId);

			// Store the chunk
			this.chunks.set(chunkId, chunk);

			// Create chunk info that will be sent to the worker
			const chunkInfo = {
				id: chunkId,
				col,
				row,
				x: chunk.x,
				y: chunk.y,
				width: this.chunkSize,
				height: this.chunkSize,
				worldWidth: this.width,
				worldHeight: this.height,
			};

			// Tell the worker to initialize this chunk
			// If we have an OffscreenCanvas, transfer it to the worker
			if (canvas) {
				await worker.api.assignChunk(
					chunkId,
					chunkInfo,
					Comlink.transfer(canvas, [canvas]),
				);
			} else {
				await worker.api.assignChunk(chunkId, chunkInfo, null);
			}

			chunk.loaded = true;

			return chunk;
		} catch (error) {
			console.error(`Failed to load chunk ${chunkId}:`, error);
			if (this.chunks.has(chunkId)) {
				// Clean up if we created but failed to load the chunk
				this.unloadChunk(chunkId);
			}
			return null;
		}
	}

	/**
	 * Unload a chunk and release its resources
	 * @param {string} chunkId - ID of the chunk to unload
	 * @returns {Promise<boolean>} Whether unloading was successful
	 */
	async unloadChunk(chunkId) {
		const chunk = this.chunks.get(chunkId);
		if (!chunk) {
			return false;
		}

		try {
			// Get the worker
			const { worker } = chunk;

			// Tell worker to release this chunk
			await worker.api.releaseChunk(chunkId);

			// Update worker chunk assignments
			worker.chunkCount--;
			worker.chunks = worker.chunks.filter((id) => {return id !== chunkId});

			// Remove chunk from our cache
			this.chunks.delete(chunkId);
			return true;
		} catch (error) {
			console.error(`Failed to unload chunk ${chunkId}:`, error);
			return false;
		}
	}

	/**
	 * Pan the viewport by the specified delta
	 * @param {number} deltaX - X amount to pan
	 * @param {number} deltaY - Y amount to pan
	 */
	panViewport(deltaX, deltaY) {
		// Update viewport position
		this.viewport.x = Math.max(
			0,
			Math.min(
				this.width - this.viewport.width / this.viewport.zoom,
				this.viewport.x + deltaX,
			),
		);
		this.viewport.y = Math.max(
			0,
			Math.min(
				this.height - this.viewport.height / this.viewport.zoom,
				this.viewport.y + deltaY,
			),
		);

		// Update which chunks are visible
		this.updateVisibleChunks();
	}

	/**
	 * Set the viewport to a specific position
	 * @param {number} x - New viewport X position
	 * @param {number} y - New viewport Y position
	 */
	setViewportPosition(x, y) {
		this.viewport.x = Math.max(
			0,
			Math.min(this.width - this.viewport.width / this.viewport.zoom, x),
		);
		this.viewport.y = Math.max(
			0,
			Math.min(this.height - this.viewport.height / this.viewport.zoom, y),
		);

		// Update which chunks are visible
		this.updateVisibleChunks();
	}

	/**
	 * Zoom the viewport around a given point
	 * @param {number} scaleFactor - Factor to scale by (>1 to zoom in, <1 to zoom out)
	 * @param {number} centerX - X coordinate to zoom around (in viewport coordinates)
	 * @param {number} centerY - Y coordinate to zoom around (in viewport coordinates)
	 */
	zoomViewport(scaleFactor, centerX, centerY) {
		// Calculate world coordinates of zoom center
		const worldX = this.viewport.x + centerX / this.viewport.zoom;
		const worldY = this.viewport.y + centerY / this.viewport.zoom;

		// Apply zoom constraint
		const newZoom = Math.max(0.1, Math.min(5, this.viewport.zoom * scaleFactor));

		// Calculate new viewport coordinates
		this.viewport.x = worldX - centerX / newZoom;
		this.viewport.y = worldY - centerY / newZoom;
		this.viewport.zoom = newZoom;

		// Constrain viewport to world bounds
		this.viewport.x = Math.max(
			0,
			Math.min(this.width - this.viewport.width / this.viewport.zoom, this.viewport.x),
		);
		this.viewport.y = Math.max(
			0,
			Math.min(this.height - this.viewport.height / this.viewport.zoom, this.viewport.y),
		);

		// Update which chunks are visible
		this.updateVisibleChunks();
	}

	/**
	 * Start the simulation
	 */
	start() {
		if (this.isRunning) {
			return;
		}

		// Tell all workers to start processing
		for (const worker of this.workers) {
			worker.api.control({ action: 'start' });
		}

		this.isRunning = true;
		this.lastFrameTime = performance.now();

		// Start the render loop
		this.animationFrameId = requestAnimationFrame(this.render);

		console.debug('🌱 Simulation started');
	}

	/**
	 * Stop the simulation
	 */
	stop() {
		if (!this.isRunning) {
			return;
		}

		// Tell all workers to stop processing
		for (const worker of this.workers) {
			worker.api.control({ action: 'stop' });
		}

		this.isRunning = false;

		// Stop the render loop
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		console.debug('🌱 Simulation stopped');
	}

	/**
	 * Toggle simulation running state
	 * @returns {boolean} New running state
	 */
	toggle() {
		if (this.isRunning) {
			this.stop();
		} else {
			this.start();
		}
		return this.isRunning;
	}

	/**
	 * Reset the simulation
	 */
	async reset() {
		// Stop the simulation if it's running
		if (this.isRunning) {
			this.stop();
		}

		// Tell all workers to reset
		for (const worker of this.workers) {
			await worker.api.control({ action: 'reset' });
		}

		console.debug('🌱 Simulation reset');
	}

	/**
	 * Main render loop - composites chunks onto the main canvas
	 * @param {number} timestamp - Animation frame timestamp
	 */
	render(timestamp) {
		// Schedule next frame immediately
		this.animationFrameId = requestAnimationFrame(this.render);

		// Skip rendering if no context or if stopped
		if (!this.ctx || !this.isRunning) {
			return;
		}

		// Calculate delta time and FPS
		const deltaTime = timestamp - this.lastFrameTime;
		this.lastFrameTime = timestamp;
		this.stats.fps = Math.round(1000 / deltaTime);

		// Clear the canvas
		this.ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);

		// Set up transformation for current view
		this.ctx.save();
		this.ctx.scale(this.viewport.zoom, this.viewport.zoom);
		this.ctx.translate(-this.viewport.x, -this.viewport.y);

		// Count total entities across all chunks
		let entityCount = 0;

		// Draw all visible chunks
		for (const chunk of this.chunks.values()) {
			// If this chunk doesn't have a bitmap, skip rendering
			if (!chunk.bitmap) {
				continue;
			}

			// Calculate if chunk is visible in current viewport
			const chunkRight = chunk.x + chunk.width;
			const chunkBottom = chunk.y + chunk.height;
			const viewLeft = this.viewport.x;
			const viewRight = this.viewport.x + this.viewport.width / this.viewport.zoom;
			const viewTop = this.viewport.y;
			const viewBottom = this.viewport.y + this.viewport.height / this.viewport.zoom;

			// Skip if chunk is outside viewport
			if (
				chunk.x > viewRight ||
				chunkRight < viewLeft ||
				chunk.y > viewBottom ||
				chunkBottom < viewTop
			) {
				continue;
			}

			// Draw the chunk
			this.ctx.drawImage(chunk.bitmap, chunk.x, chunk.y);

			// Update entity count
			entityCount += chunk.entities.length;

			// Draw debug info if needed
			// this.drawDebugInfo(chunk);
		}

		// Restore canvas state
		this.ctx.restore();

		// Update stats
		this.stats.totalEntities = entityCount;

		// Trigger any update callbacks
		if (Date.now() - this.stats.lastUpdate > 500) {
			// Limit stat updates to every 500ms
			this.onTileUpdate(this.stats);
			this.stats.lastUpdate = Date.now();
		}
	}

	/**
	 * Draw debug information for a chunk
	 * @private
	 * @param {Object} chunk - The chunk to draw debug info for
	 */
	drawDebugInfo(chunk) {
		this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
		this.ctx.lineWidth = 2;
		this.ctx.strokeRect(chunk.x, chunk.y, chunk.width, chunk.height);

		this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
		this.ctx.fillRect(chunk.x, chunk.y, 70, 30);

		this.ctx.fillStyle = '#ffffff';
		this.ctx.font = '10px monospace';
		this.ctx.fillText(`Chunk: ${chunk.id}`, chunk.x + 5, chunk.y + 15);
		this.ctx.fillText(`Entities: ${chunk.entities.length}`, chunk.x + 5, chunk.y + 25);
	}

	/**
	 * Handle messages from web workers
	 * @private
	 * @param {Worker} worker - The worker that sent the message
	 * @param {MessageEvent} event - The message event
	 */
	handleWorkerMessage(worker, event) {
		const { type, chunkId, ...data } = event.data;

		switch (type) {
			case 'workerStatus':
				// Worker sent a status update
				// console.debug(`Worker ${data.workerId}: ${data.status}`);
				break;

			case 'chunkReady':
				// A chunk has been initialized
				if (this.chunks.has(chunkId)) {
					this.chunks.get(chunkId).ready = true;
				}
				break;

			case 'chunkUpdate':
				// A chunk has updated its entities
				this.updateChunkData(chunkId, data);
				break;

			case 'chunkBitmap':
				// Worker sent an updated bitmap for a chunk
				if (data.bitmap && this.chunks.has(chunkId)) {
					this.chunks.get(chunkId).bitmap = data.bitmap;
				}
				break;

			default:
				console.debug(`Unknown message from worker: ${type}`);
				break;
		}
	}

	/**
	 * Update a chunk's data based on worker message
	 * @private
	 * @param {string} chunkId - ID of the chunk to update
	 * @param {Object} data - Update data from the worker
	 */
	updateChunkData(chunkId, data) {
		const chunk = this.chunks.get(chunkId);
		if (!chunk) {
			return;
		}

		// Update entity data for this chunk
		if (data.entities) {
			chunk.entities = data.entities;
		}

		// Update timestamp
		chunk.lastUpdate = Date.now();
	}

	/**
	 * Spawn an entity in the world
	 * @param {Object} entityData - Entity data
	 * @param {number} [entityData.x] - X position (if not specified, will be random)
	 * @param {number} [entityData.y] - Y position (if not specified, will be random)
	 * @returns {Promise<Object>} The created entity
	 */
	async spawnEntity(entityData = {}) {
		// Generate random position if not specified
		const x = entityData.x !== undefined ? entityData.x : Math.random() * this.width;
		const y = entityData.y !== undefined ? entityData.y : Math.random() * this.height;

		// Determine which chunk this position falls into
		const col = Math.floor(x / this.chunkSize);
		const row = Math.floor(y / this.chunkSize);
		const chunkId = `chunk-${col}-${row}`;

		// Check if this chunk is loaded
		if (!this.chunks.has(chunkId)) {
			// Try to load the chunk
			const chunkCoord = { col, row, chunkId };
			await this.loadChunk(chunkCoord);

			// If still not loaded, fail
			if (!this.chunks.has(chunkId)) {
				console.error(`Cannot spawn entity - chunk ${chunkId} is not loaded`);
				return null;
			}
		}

		// Get the chunk
		const chunk = this.chunks.get(chunkId);

		// Create entity data
		const entity = {
			id: `entity-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
			x,
			y,
			vx: entityData.vx || 0,
			vy: entityData.vy || 0,
			energy: entityData.energy || 100,
			species:
				entityData.species !== undefined
					? entityData.species
					: Math.floor(Math.random() * 3),
			size: entityData.size || 5,
			type: entityData.type || 'lifeform',
			created: Date.now(),
			...entityData, // Include any other properties
		};

		// Tell the worker to spawn this entity
		await chunk.worker.api.spawnEntity(chunkId, entity);

		return entity;
	}

	/**
	 * Clean up all resources
	 */
	dispose() {
		// Stop simulation if running
		if (this.isRunning) {
			this.stop();
		}

		// Terminate all workers
		for (const worker of this.workers) {
			worker.worker.terminate();
		}

		// Clear all chunks
		this.chunks.clear();
		this.workers = [];

		console.debug('🌱 TileManager disposed');
	}
}