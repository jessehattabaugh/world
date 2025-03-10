/**
 * Chunk Manager - Manages simulation chunks and interfaces with slippy map
 */
import * as L from 'leaflet';

import {
	assignChunkToWorker,
	controlWorker,
	createChunkWorker,
	spawnEntityInChunk,
} from './chunk-worker-manager.js';

export class ChunkManager {
	constructor(options = {}) {
		this.chunkSize = options.chunkSize || 256;
		this.maxWorkers = options.maxWorkers || navigator.hardwareConcurrency || 4;
		this.bufferZone = options.bufferZone || 1;

		// Initialize Leaflet map
		this.map = L.map(options.mapContainer, {
			center: [0, 0],
			zoom: 2,
			minZoom: 0,
			maxZoom: 5,
			crs: L.CRS.Simple, // Use simple coordinate system
		});

		// Custom layer for our simulation
		this.simulationLayer = L.canvasLayer({
			drawCallback: this.drawSimulation.bind(this),
		}).addTo(this.map);

		// Track active chunks
		this.activeChunks = new Map();
		this.workers = [];
		this.initialized = false;
	}

	/**
	 * Initialize chunk system and workers
	 */
	async initialize() {
		// Create workers using the chunk-worker-manager utility
		for (let i = 0; i < this.maxWorkers; i++) {
			const worker = createChunkWorker({
				workerId: i,
			});
			this.workers.push(worker);
		}

		// Listen for map movements to update chunks
		this.map.on('moveend', () => this.updateVisibleChunks());
		this.map.on('zoomend', () => this.updateVisibleChunks());

		this.initialized = true;
		return true;
	}

	/**
	 * Calculate which chunks are visible in the current viewport
	 */
	updateVisibleChunks() {
		const bounds = this.map.getBounds();
		const visibleChunks = this.getChunksInBounds(bounds);

		// Unload chunks that are no longer visible
		for (const [chunkId, chunk] of this.activeChunks) {
			if (!visibleChunks.has(chunkId)) {
				this.unloadChunk(chunkId);
			}
		}

		// Load new visible chunks
		for (const chunkId of visibleChunks) {
			if (!this.activeChunks.has(chunkId)) {
				this.loadChunk(chunkId);
			}
		}
	}

	// ... rest of chunk management code ...
}
