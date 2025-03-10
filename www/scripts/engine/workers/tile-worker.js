/**
 * Tile Worker
 *
 * Handles simulation and rendering for a specific tile in the world grid
 * Uses OffscreenCanvas for independent rendering
 * Exposes a Comlink-compatible API for the main thread
 */
import * as Comlink from 'https://unpkg.com/comlink/dist/esm/comlink.mjs';

import { Lifeform } from '../lifeform.js';

/**
 * TileWorker class to handle simulation and rendering for a specific tile
 */
class TileWorker {
	/**
	 * Create a new tile worker instance
	 */
	constructor() {
		// Configuration
		this.config = {
			tileSize: 256,
			worldWidth: 0,
			worldHeight: 0,
		};

		// Active tiles managed by this worker
		this.tiles = new Map(); // tileId -> tileData

		// Entity storage
		this.entities = new Map(); // entityId -> entity

		// Animation frame handling
		this.animationFrameId = null;
		this.isRunning = false;

		// Performance metrics
		this.metrics = {
			processingTime: 0,
			entityCount: 0,
			frameCount: 0,
		};

		console.debug('Tile worker created');
	}

	/**
	 * Initialize the worker with configuration parameters
	 * @param {Object} config - Configuration parameters
	 * @param {number} config.tileSize - Size of each tile
	 * @param {number} config.worldWidth - Total world width
	 * @param {number} config.worldHeight - Total world height
	 */
	async initialize(config) {
		this.config = { ...this.config, ...config };
		console.debug('Tile worker initialized with config:', this.config);
		return true;
	}

	/**
	 * Initialize a specific tile within this worker
	 * @param {Object} tileData - Tile information
	 * @param {string} tileData.id - Unique tile identifier (e.g. "3-4")
	 * @param {number} tileData.x - X position of tile in world coordinates
	 * @param {number} tileData.y - Y position of tile in world coordinates
	 * @param {number} tileData.width - Width of the tile
	 * @param {number} tileData.height - Height of the tile
	 * @param {OffscreenCanvas} tileData.canvas - OffscreenCanvas for rendering
	 */
	async initializeTile(tileData) {
		// Create a tile record
		const tile = {
			id: tileData.id,
			x: tileData.x,
			y: tileData.y,
			width: tileData.width,
			height: tileData.height,
			canvas: tileData.canvas,
			ctx: tileData.canvas.getContext('2d', {
				alpha: true,
				desynchronized: true, // Potential performance optimization
				willReadFrequently: false,
			}),
			entities: new Set(),
			lastUpdateTime: performance.now(),
			needsRedraw: true,
			isActive: true,
			bufferedUpdates: [],
		};

		// Configure the context
		tile.ctx.imageSmoothingEnabled = false; // Pixel perfect rendering

		// Store the tile
		this.tiles.set(tileData.id, tile);

		// Draw initial tile state
		this.renderTile(tile.id);

		console.debug(`Tile ${tileData.id} initialized in worker`);
		return true;
	}

	/**
	 * Release a tile and clean up its resources
	 * @param {string} tileId - ID of tile to release
	 */
	async releaseTile(tileId) {
		const tile = this.tiles.get(tileId);
		if (!tile) {
			return false;
		}

		// Remove all entities that belong to this tile
		for (const entityId of tile.entities) {
			this.entities.delete(entityId);
		}

		// Clean up canvas explicitly
		if (tile.canvas) {
			tile.ctx = null;
			tile.canvas = null;
		}

		// Remove tile
		this.tiles.delete(tileId);

		console.debug(`Tile ${tileId} released from worker`);
		return true;
	}

	/**
	 * Process a tile for one simulation step
	 * @param {Object} params - Processing parameters
	 * @param {string} params.id - ID of tile to process
	 * @param {number} params.timestamp - Current timestamp
	 * @param {Array<string>} params.entities - Entity IDs to process
	 * @param {boolean} params.isVisible - Whether tile is currently visible
	 */
	async processTile({ id, timestamp, entities, isVisible }) {
		const tile = this.tiles.get(id);
		if (!tile) {
			return false;
		}

		const startTime = performance.now();

		// Calculate delta time since last update
		const deltaTime = timestamp - tile.lastUpdateTime;
		tile.lastUpdateTime = timestamp;

		// Sync entities with the tile
		this.syncTileEntities(tile, entities);

		// Process simulation for entities in this tile
		if (tile.entities.size > 0) {
			// Update each entity
			for (const entityId of tile.entities) {
				const entity = this.entities.get(entityId);
				if (entity) {
					this.updateEntity(entity, deltaTime, tile);
				}
			}

			// Mark tile for redraw
			tile.needsRedraw = true;
		}

		// Render tile if visible
		if (isVisible && tile.needsRedraw) {
			this.renderTile(id);
			tile.needsRedraw = false;
		}

		// Update metrics
		this.metrics.processingTime = performance.now() - startTime;
		this.metrics.entityCount = tile.entities.size;
		this.metrics.frameCount++;

		return true;
	}

	/**
	 * Update entity state for a simulation step
	 * @param {Object} entity - Entity to update
	 * @param {number} deltaTime - Time elapsed since last update
	 * @param {Object} tile - Current tile
	 * @private
	 */
	updateEntity(entity, deltaTime, tile) {
		// Determine entity type and process accordingly
		if (entity instanceof Lifeform) {
			// Calculate nearby entities (simplified for demo)
			const nearbyEntities = Array.from(tile.entities)
				.map((id) => {
					return this.entities.get(id);
				})
				.filter((e) => {
					return e && e !== entity;
				});

			// Update lifeform state
			const result = entity.update(deltaTime, nearbyEntities, {
				width: this.config.worldWidth,
				height: this.config.worldHeight,
			});

			// Handle special results
			if (result) {
				if (result.type === 'died') {
					// Remove dead entity
					tile.entities.delete(entity.id);
					this.entities.delete(entity.id);
				} else if (result.type === 'reproduced' && result.offspring) {
					// Add new offspring
					const { offspring } = result;
					this.entities.set(offspring.id, offspring);
					tile.entities.add(offspring.id);
					tile.bufferedUpdates.push({
						type: 'entity_added',
						entity: offspring,
					});
				}
			}
		} else {
			// Generic entity update (position based on velocity)
			if (entity.velocity && entity.position) {
				entity.position.x += entity.velocity.x * deltaTime;
				entity.position.y += entity.velocity.y * deltaTime;

				// Simple boundary checking
				if (entity.position.x < tile.x) {
					entity.position.x = tile.x;
				}
				if (entity.position.y < tile.y) {
					entity.position.y = tile.y;
				}
				if (entity.position.x > tile.x + tile.width) {
					entity.position.x = tile.x + tile.width;
				}
				if (entity.position.y > tile.y + tile.height) {
					entity.position.y = tile.y + tile.height;
				}
			}
		}
	}

	/**
	 * Synchronize entity list with the current tile
	 * @param {Object} tile - Tile to update
	 * @param {Array<string>} entityIds - Entity IDs from main thread
	 * @private
	 */
	syncTileEntities(tile, entityIds) {
		// Clear buffered updates
		tile.bufferedUpdates = [];

		// Find entities to add
		for (const entityId of entityIds) {
			if (!tile.entities.has(entityId) && !this.entities.has(entityId)) {
				// Request entity data from main thread
				tile.bufferedUpdates.push({
					type: 'entity_needed',
					entityId,
				});
			}
			tile.entities.add(entityId);
		}

		// Entities that are no longer in this tile
		const toRemove = [];
		for (const entityId of tile.entities) {
			if (!entityIds.includes(entityId)) {
				toRemove.push(entityId);
			}
		}

		// Remove entities that are no longer in this tile
		for (const entityId of toRemove) {
			tile.entities.delete(entityId);
			// Don't delete from this.entities as it might be in another tile
		}
	}

	/**
	 * Render a specific tile
	 * @param {string} tileId - ID of tile to render
	 * @private
	 */
	renderTile(tileId) {
		const tile = this.tiles.get(tileId);
		if (!tile || !tile.ctx) {
			return;
		}

		const { ctx } = tile;

		// Clear tile
		ctx.clearRect(0, 0, tile.width, tile.height);

		// Draw background (grid pattern to visualize tile bounds)
		ctx.fillStyle = '#0a1e12';
		ctx.fillRect(0, 0, tile.width, tile.height);

		// Draw grid lines for debugging
		ctx.strokeStyle = 'rgba(30, 100, 50, 0.15)';
		ctx.lineWidth = 1;

		// Draw grid
		const gridSize = 32;
		for (let x = 0; x < tile.width; x += gridSize) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, tile.height);
			ctx.stroke();
		}

		for (let y = 0; y < tile.height; y += gridSize) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(tile.width, y);
			ctx.stroke();
		}

		// Draw entities
		for (const entityId of tile.entities) {
			const entity = this.entities.get(entityId);
			if (!entity) {
				continue;
			}

			// Transform to local tile coordinates
			const localX = entity.position.x - tile.x;
			const localY = entity.position.y - tile.y;

			// Draw based on entity type
			if (entity instanceof Lifeform) {
				this.renderLifeform(ctx, entity, localX, localY);
			} else {
				// Default entity rendering
				ctx.fillStyle = entity.color || 'white';
				ctx.beginPath();
				ctx.arc(localX, localY, entity.size || 5, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		// Draw tile ID for debugging
		ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
		ctx.font = '10px monospace';
		ctx.fillText(`Tile ${tileId} (${tile.entities.size} entities)`, 5, 15);
	}

	/**
	 * Render a lifeform entity
	 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
	 * @param {Lifeform} lifeform - Lifeform to render
	 * @param {number} x - X position in local tile coordinates
	 * @param {number} y - Y position in local tile coordinates
	 * @private
	 */
	renderLifeform(ctx, lifeform, x, y) {
		const size = lifeform.size || 5;

		// Different colors for different species
		let color;
		switch (lifeform.species) {
			case 0: // Plant
				color = `hsl(120, ${80 * lifeform.genes.color + 20}%, ${
					40 * lifeform.genes.color + 30
				}%)`;
				break;
			case 1: // Herbivore
				color = `hsl(200, ${80 * lifeform.genes.color + 20}%, ${
					40 * lifeform.genes.color + 30
				}%)`;
				break;
			case 2: // Carnivore
				color = `hsl(0, ${80 * lifeform.genes.color + 20}%, ${
					40 * lifeform.genes.color + 30
				}%)`;
				break;
			default:
				color = 'white';
		}

		// Draw the lifeform
		ctx.fillStyle = color;

		// Draw based on pattern gene
		switch (lifeform.genes.pattern) {
			case 0: // Circle
				ctx.beginPath();
				ctx.arc(x, y, size, 0, Math.PI * 2);
				ctx.fill();
				break;

			case 1: // Square
				ctx.fillRect(x - size, y - size, size * 2, size * 2);
				break;

			case 2: // Triangle
				ctx.beginPath();
				ctx.moveTo(x, y - size);
				ctx.lineTo(x - size, y + size);
				ctx.lineTo(x + size, y + size);
				ctx.closePath();
				ctx.fill();
				break;
		}

		// Show energy level as a small indicator
		const energyRatio = lifeform.energy / lifeform.maxEnergy;
		const energyColor = `hsl(${energyRatio * 120}, 70%, 60%)`;

		ctx.fillStyle = energyColor;
		ctx.fillRect(x - size, y - size - 3, size * 2 * energyRatio, 2);

		// Show direction for animals
		if (lifeform.species > 0 && lifeform.velocity) {
			const speed = Math.sqrt(
				lifeform.velocity.x * lifeform.velocity.x +
					lifeform.velocity.y * lifeform.velocity.y,
			);

			if (speed > 0.1) {
				const angle = Math.atan2(lifeform.velocity.y, lifeform.velocity.x);
				const dirX = x + Math.cos(angle) * (size + 3);
				const dirY = y + Math.sin(angle) * (size + 3);

				ctx.strokeStyle = color;
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(dirX, dirY);
				ctx.stroke();
			}
		}
	}

	/**
	 * Create a bitmap of the current tile rendering
	 * @param {string} tileId - ID of tile to get bitmap for
	 * @returns {ImageBitmap} Bitmap of the tile
	 */
	async getTileBitmap(tileId) {
		const tile = this.tiles.get(tileId);
		if (!tile || !tile.canvas) {
			return null;
		}

		// Create a bitmap from the canvas
		return createImageBitmap(tile.canvas);
	}

	/**
	 * Spawn a new entity in a specific tile
	 * @param {Object} entityOptions - Entity configuration
	 * @param {string} entityId - ID to assign to the entity
	 * @param {string} tileId - ID of tile where entity should be placed
	 */
	async spawnEntity(entityOptions, entityId, tileId) {
		const tile = this.tiles.get(tileId);
		if (!tile) {
			return false;
		}

		// Create entity based on type
		let entity;

		if (entityOptions.type === 'lifeform') {
			// Create a new lifeform
			entity = new Lifeform({
				...entityOptions,
				id: entityId,
			});
		} else {
			// Generic entity
			entity = {
				...entityOptions,
				id: entityId,
			};
		}

		// Add to entity collection
		this.entities.set(entityId, entity);
		tile.entities.add(entityId);

		console.debug(`Entity ${entityId} spawned in tile ${tileId}`);
		return true;
	}

	/**
	 * Reset the worker state
	 */
	async reset() {
		// Clear all entities
		this.entities.clear();

		// Reset all tiles but don't delete them
		for (const [tileId, tile] of this.tiles.entries()) {
			tile.entities.clear();
			tile.needsRedraw = true;
			tile.bufferedUpdates = [];

			// Re-render the empty tile
			this.renderTile(tileId);
		}

		// Reset metrics
		this.metrics = {
			processingTime: 0,
			entityCount: 0,
			frameCount: 0,
		};

		console.debug('Tile worker reset');
		return true;
	}

	/**
	 * Get current metrics
	 * @returns {Object} Current performance metrics
	 */
	async getMetrics() {
		return { ...this.metrics };
	}

	/**
	 * Clean up resources
	 */
	async dispose() {
		// Release all tiles
		for (const tileId of this.tiles.keys()) {
			await this.releaseTile(tileId);
		}

		// Clear all collections
		this.entities.clear();
		this.tiles.clear();

		console.debug('Tile worker disposed');
		return true;
	}
}

// Export the worker API using Comlink
Comlink.expose(new TileWorker());