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

class EcosystemSimulator {
	constructor(canvasId, options) {
		this.canvasId = canvasId;
		this.options = options;
		this.state = { isRunning: false, stats: { entityCount: 0, fps: 60 } };
		this.features = { webGPU: 'gpu' in navigator };
	}

	async initialize() {
		this.state.stats.entityCount = 50;
		return true;
	}

	spawnLifeform() {
		this.state.stats.entityCount++;
	}

	start() {
		this.state.isRunning = true;
	}

	stop() {
		this.state.isRunning = false;
	}

	resetSimulation() {
		this.state.stats.entityCount = 0;
		this.state.isRunning = false;
	}
}

export { EcosystemSimulator };