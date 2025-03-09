/**
 * Tile Manager
 *
 * Handles distributed processing of the simulation space using Web Workers
 */
export class TileManager {
    constructor(width, height, tileSize = 128) {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;

        // Calculate grid dimensions
        this.cols = Math.ceil(width / tileSize);
        this.rows = Math.ceil(height / tileSize);

        // Initialize workers and tiles
        this.workers = new Map();
        this.tiles = new Map();
        this.nextWorkerId = 0;

        // Performance metrics
        this.metrics = {
            workerCount: 0,
            tileCount: 0,
            averageProcessingTime: 0
        };
    }

    /**
     * Initialize the tile system
     */
    async initialize() {
        const workerCount = navigator.hardwareConcurrency || 4;

        // Create workers
        for (let i = 0; i < workerCount; i++) {
            const worker = new Worker(
                new URL('./workers/tile-worker.js', import.meta.url),
                { type: 'module' }
            );

            const workerId = this.nextWorkerId++;
            this.workers.set(workerId, {
                worker,
                busy: false,
                tiles: new Set()
            });
        }

        // Create tiles
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const tile = {
                    id: `${row}-${col}`,
                    x: col * this.tileSize,
                    y: row * this.tileSize,
                    width: Math.min(this.tileSize, this.width - col * this.tileSize),
                    height: Math.min(this.tileSize, this.height - row * this.tileSize),
                    entities: new Set(),
                    workerId: null,
                    lastProcessed: 0
                };

                this.tiles.set(tile.id, tile);
            }
        }

        this.metrics.workerCount = this.workers.size;
        this.metrics.tileCount = this.tiles.size;

        return true;
    }

    /**
     * Assign entities to tiles
     */
    updateEntityTiles(entities) {
        // Clear existing assignments
        for (const tile of this.tiles.values()) {
            tile.entities.clear();
        }

        // Assign entities to tiles
        for (const entity of entities) {
            const col = Math.floor(entity.position[0] / this.tileSize);
            const row = Math.floor(entity.position[1] / this.tileSize);

            if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
                const tileId = `${row}-${col}`;
                const tile = this.tiles.get(tileId);
                if (tile) {
                    tile.entities.add(entity.id);
                }
            }
        }
    }

    /**
     * Process all tiles using available workers
     */
    async processTiles(entities, timestamp) {
        const promises = [];
        const startTime = performance.now();

        // Assign entities to tiles
        this.updateEntityTiles(entities);

        // Find available workers and assign tiles
        for (const [workerId, workerInfo] of this.workers) {
            if (workerInfo.busy) {continue;}

            // Find unprocessed tiles
            const unprocessedTiles = Array.from(this.tiles.values())
                .filter(tile =>
                    {return tile.lastProcessed < timestamp &&
                    tile.entities.size > 0}
                );

            if (unprocessedTiles.length === 0) {break;}

            // Assign tile to worker
            const tile = unprocessedTiles[0];
            tile.workerId = workerId;
            workerInfo.tiles.add(tile.id);
            workerInfo.busy = true;

            // Prepare tile data
            const tileData = {
                id: tile.id,
                bounds: {
                    x: tile.x,
                    y: tile.y,
                    width: tile.width,
                    height: tile.height
                },
                entities: Array.from(tile.entities).map(id => {return entities.get(id)})
            };

            // Process tile
            promises.push(new Promise((resolve, reject) => {
                const messageHandler = (event) => {
                    if (event.data.tileId === tile.id) {
                        workerInfo.worker.removeEventListener('message', messageHandler);
                        workerInfo.busy = false;
                        workerInfo.tiles.delete(tile.id);
                        tile.lastProcessed = timestamp;
                        resolve(event.data.results);
                    }
                };

                workerInfo.worker.addEventListener('message', messageHandler);
                workerInfo.worker.postMessage({
                    type: 'process',
                    tile: tileData,
                    timestamp
                });
            }));
        }

        // Wait for all tiles to complete
        const results = await Promise.all(promises);

        // Update metrics
        const endTime = performance.now();
        this.metrics.averageProcessingTime =
            (endTime - startTime) / this.tiles.size;

        return results;
    }

    /**
     * Get tile processing metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Clean up resources
     */
    dispose() {
        for (const workerInfo of this.workers.values()) {
            workerInfo.worker.terminate();
        }
        this.workers.clear();
        this.tiles.clear();
    }
}