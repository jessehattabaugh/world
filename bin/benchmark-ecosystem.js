import { performance } from 'perf_hooks';
import { test } from '@playwright/test';
import { writeFileSync } from 'fs';

const BENCHMARKS = [
	// Test scaling with different entity counts
	{ name: 'small-simulation', entityCount: 100, duration: 10000 },
	{ name: 'medium-simulation', entityCount: 1000, duration: 10000 },
	{ name: 'large-simulation', entityCount: 5000, duration: 10000 },

	// Test different species distributions
	{
		name: 'balanced-ecosystem',
		entityCount: 1000,
		distribution: { plants: 0.4, herbivores: 0.4, predators: 0.2 },
		duration: 10000,
	},

	// Test neural network complexity impact
	{
		name: 'complex-brains',
		entityCount: 1000,
		neuralConfig: { hiddenSize: 16 },
		duration: 10000,
	},

	// Test worker thread scaling
	{ name: 'multi-worker', entityCount: 1000, workerCount: 4, duration: 10000 },
];

const results = {
	system: {
		platform: process.platform,
		arch: process.arch,
		version: process.version,
		webgpu: false,
		cores: navigator.hardwareConcurrency,
	},
	benchmarks: [],
};

async function runBenchmark(page, config) {
	const start = performance.now();
	const metrics = {
		name: config.name,
		frameCount: 0,
		entityCount: 0,
		totalTime: 0,
		avgFps: 0,
		avgFrameTime: 0,
		peakEntityCount: 0,
		gpuMemoryUsage: 0,
	};

	// Initialize simulation with benchmark config
	await page.evaluate((config) => {
		window.jessesWorld.simulator.resetSimulation();

		// Spawn initial entities
		const total = config.entityCount;
		const dist = config.distribution || {
			plants: 0.3,
			herbivores: 0.5,
			predators: 0.2,
		};

		// Spawn entities according to distribution
		const spawnCount = {
			plants: Math.floor(total * dist.plants),
			herbivores: Math.floor(total * dist.herbivores),
			predators: Math.floor(total * dist.predators),
		};

		for (const [type, count] of Object.entries(spawnCount)) {
			for (let i = 0; i < count; i++) {
				let species;
				if (type === 'plants') {
					species = 0;
				} else if (type === 'herbivores') {
					species = 1;
				} else {
					species = 2;
				}
				window.jessesWorld.simulator.spawnLifeform({ species });
			}
		}

		// Configure neural networks if specified
		if (config.neuralConfig) {
			window.jessesWorld.simulator.setNeuralConfig(config.neuralConfig);
		}

		// Configure worker threads if specified
		if (config.workerCount) {
			window.jessesWorld.simulator.setWorkerCount(config.workerCount);
		}

		window.jessesWorld.simulator.start();
	}, config);

	// Collect metrics during benchmark
	const interval = setInterval(async () => {
		const stats = await page.evaluate(() => {
			return window.jessesWorld.simulator.getStats();
		});

		metrics.frameCount++;
		metrics.entityCount = stats.entityCount;
		metrics.peakEntityCount = Math.max(metrics.peakEntityCount, stats.entityCount);
		metrics.avgFrameTime += stats.frameTime;

		if (stats.gpuMemoryUsage) {
			metrics.gpuMemoryUsage = Math.max(metrics.gpuMemoryUsage, stats.gpuMemoryUsage);
		}
	}, 100);

	// Wait for benchmark duration
	await new Promise((resolve) => {
		setTimeout(resolve, config.duration);
	});
	clearInterval(interval);

	// Stop simulation and calculate final metrics
	await page.evaluate(() => {
		window.jessesWorld.simulator.stop();
	});

	metrics.totalTime = performance.now() - start;
	metrics.avgFrameTime /= metrics.frameCount;
	metrics.avgFps = 1000 / metrics.avgFrameTime;

	results.benchmarks.push(metrics);
}

test('Run ecosystem benchmarks', async ({ page }) => {
	// Navigate to simulator page
	await page.goto('http://localhost:3000');

	// Check for WebGPU support
	results.system.webgpu = await page.evaluate(() => {
		return 'gpu' in navigator;
	});

	// Run each benchmark configuration
	const promises = [];
	for (const config of BENCHMARKS) {
		console.log(`Running benchmark: ${config.name}`);
		promises.push(runBenchmark(page, config));
	}
	await Promise.all(promises);

	// Export results
	writeFileSync('benchmark-results.json', JSON.stringify(results, null, 2));

	console.log('Benchmark results saved to benchmark-results.json');
});
