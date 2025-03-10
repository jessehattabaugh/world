/**
 * Chunk Worker Module - Handles processing for individual chunks in the WebGPU ecosystem simulation
 *
 * This module serves as an entry point for creating chunk workers and handling their lifecycle.
 */

import { ResourceManager } from './resource-manager.js';
// Import related modules
import { WebGPUManager } from './webgpu-manager.js';

/**
 * Create a new chunk worker
 * @param {Object} options - Configuration options
 * @returns {Worker} - The initialized worker
 */
export function createChunkWorker(options = {}) {
	const worker = new Worker(new URL('./workers/chunk-worker.js', import.meta.url), {
		type: 'module',
	});

	// Set up basic message handler
	worker.addEventListener('message', (event) => {
		const { type } = event.data;

		if (type === 'workerStatus') {
			console.log(`Chunk worker status: ${event.data.status}`, event.data);
		}
	});

	// Initialize the worker
	const features = {
		webGPU: options.webGPU !== false && 'gpu' in navigator,
		offscreenCanvas: 'OffscreenCanvas' in window,
	};

	worker.postMessage({
		type: 'init',
		workerId: options.workerId || 0,
		features,
	});

	return worker;
}

/**
 * Assign a chunk to a worker
 * @param {Worker} worker - The worker to assign the chunk to
 * @param {string} chunkId - Unique identifier for the chunk
 * @param {Object} chunkInfo - Information about the chunk
 * @param {OffscreenCanvas} [canvas] - Optional OffscreenCanvas for the chunk
 */
export function assignChunkToWorker(worker, chunkId, chunkInfo, canvas) {
	worker.postMessage(
		{
			type: 'assignChunk',
			chunkId,
			chunkInfo,
			canvas,
		},
		canvas ? [canvas] : [],
	);
}

/**
 * Spawn an entity in a specific chunk
 * @param {Worker} worker - The worker responsible for the chunk
 * @param {string} chunkId - ID of the chunk
 * @param {Object} entity - Entity data
 */
export function spawnEntityInChunk(worker, chunkId, entity) {
	worker.postMessage({
		type: 'spawnEntity',
		chunkId,
		entity,
	});
}

/**
 * Send control command to a worker
 * @param {Worker} worker - The worker to control
 * @param {string} action - The action to perform
 */
export function controlWorker(worker, action) {
	worker.postMessage({
		type: 'control',
		action,
	});
}
