/**
 * Core Simulation
 * Manages the main simulation loop and entity state
 */

import NeuralNetwork from './neural-network.js';
import { ResourceManager } from './resource-manager.js';
import { preprocessShader } from '../utils/wgsl-preprocessor.js';
import { initComputePipeline, runCompute } from './compute-pipeline.js';

export class CoreSimulation {
	constructor(gpuManager) {
		this.gpuManager = gpuManager;
		this.resourceManager = new ResourceManager();

		// Use Map for O(1) entity lookup
		this.entities = new Map();
		this.networks = new Map();

		// Stats tracking
		this.stats = {
			entityCount: 0,
			networkCount: 0,
			frameTime: 0,
		};

		// Simulation parameters
		this.params = {
			frameCount: 0,
			deltaTime: 0,
			worldWidth: 800,
			worldHeight: 600,
			plantGrowthRate: 0.01,
			herbivoreSpeed: 2.0,
			carnivoreSpeed: 3.0,
			enableMutation: true,
			enableReproduction: true,
		};

		// WebGPU resources
		this.gpuResources = {
			entityBuffer: null,
			networkBuffer: null,
			paramBuffer: null,
			computePipeline: null,
		};
	}

	async initialize() {
		if (!this.gpuManager.isReady()) {
			throw new Error('WebGPU not available');
		}

		// Load and preprocess compute shader
		const shaderCode = await fetch('/scripts/shaders/neural-compute.wgsl').then((r) => {
			return r.text();
		});

		const processedCode = await preprocessShader(shaderCode, {
			defines: {
				MAX_ENTITIES: '1000',
				WORKGROUP_SIZE: '64',
			},
		});

		// Create GPU buffers with proper alignment
		this.gpuResources.entityBuffer = this.gpuManager.createBuffer({
			size: 1000 * 48, // 48 bytes per entity
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
		});

		this.gpuResources.networkBuffer = this.gpuManager.createBuffer({
			size: 1000 * 192, // 192 bytes per network
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		this.gpuResources.paramBuffer = this.gpuManager.createBuffer({
			size: 64, // 16 float params
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		// Create compute pipeline
		this.gpuResources.computePipeline = await this.gpuManager.createComputePipeline({
			code: processedCode,
			entryPoint: 'main',
		});

		// Initialize compute pipeline and buffers for lifeform data.
		this.computeObjects = await initComputePipeline(this.device);
		// Optionally upload initial lifeform data here.
		console.log('Core simulation initialized with GPU buffers');
		return true;
	}

	update(deltaTime) {
		const startTime = performance.now();
		this.params.deltaTime = deltaTime;
		this.params.frameCount++;

		// Update GPU buffers
		this.updateGPUBuffers();

		// Dispatch compute shader
		const encoder = this.gpuManager.device.createCommandEncoder();
		const pass = encoder.beginComputePass();

		pass.setPipeline(this.gpuResources.computePipeline);
		pass.setBindGroup(0, this.gpuResources.bindGroup);

		const workgroupCount = Math.ceil(this.entities.size / 64);
		pass.dispatchWorkgroups(workgroupCount);
		pass.end();

		// Read back results
		this.readBackResults(encoder);

		// Submit GPU commands
		this.gpuManager.device.queue.submit([encoder.finish()]);

		// Update resources and stats
		this.resourceManager.update(performance.now());
		this.updateStats(startTime);
	}

	updateGPUBuffers() {
		// Update entity buffer
		const entityData = new Float32Array(this.entities.size * 12); // 48 bytes per entity
		let offset = 0;

		for (const entity of this.entities.values()) {
			entityData.set(
				[
					entity.position[0],
					entity.position[1],
					entity.velocity[0],
					entity.velocity[1],
					entity.energy,
					entity.species,
					entity.size,
					...entity.genes,
				],
				offset,
			);
			offset += 12;
		}

		this.gpuManager.device.queue.writeBuffer(
			this.gpuResources.entityBuffer,
			0,
			entityData.buffer,
		);

		// Update network buffer
		const networkData = new Float32Array(this.networks.size * 48); // 192 bytes per network
		offset = 0;

		for (const network of this.networks.values()) {
			networkData.set(network.toGPUFormat(), offset);
			offset += 48;
		}

		this.gpuManager.device.queue.writeBuffer(
			this.gpuResources.networkBuffer,
			0,
			networkData.buffer,
		);

		// Update params buffer
		const paramData = new Float32Array([
			this.params.deltaTime,
			this.params.frameCount,
			this.params.worldWidth,
			this.params.worldHeight,
			this.params.plantGrowthRate,
			this.params.herbivoreSpeed,
			this.params.carnivoreSpeed,
			this.params.enableMutation ? 1 : 0,
			this.params.enableReproduction ? 1 : 0,
			Math.random() * 0xffffffff, // Random seed
			0,
			0,
			0,
			0,
			0,
			0, // Padding for alignment
		]);

		this.gpuManager.device.queue.writeBuffer(
			this.gpuResources.paramBuffer,
			0,
			paramData.buffer,
		);
	}

	async readBackResults(encoder) {
		// Create staging buffer for readback
		const stagingBuffer = this.gpuManager.device.createBuffer({
			size: this.entities.size * 48,
			usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
		});

		// Copy results to staging buffer
		encoder.copyBufferToBuffer(
			this.gpuResources.entityBuffer,
			0,
			stagingBuffer,
			0,
			this.entities.size * 48,
		);

		// Read back results
		await stagingBuffer.mapAsync(GPUMapMode.READ);
		const entityData = new Float32Array(stagingBuffer.getMappedRange());

		// Update entity states
		let offset = 0;
		for (const entity of this.entities.values()) {
			[
				entity.position[0],
				entity.position[1],
				entity.velocity[0],
				entity.velocity[1],
				entity.energy,
			] = entityData.slice(offset, offset + 5);
			offset += 12;
		}

		stagingBuffer.unmap();
		stagingBuffer.destroy();
	}

	updateStats(startTime) {
		const endTime = performance.now();
		this.stats = {
			entityCount: this.entities.size,
			networkCount: this.networks.size,
			frameTime: endTime - startTime,
		};
	}

	// Entity management methods
	spawnLifeform(options = {}) {
		const entity = {
			id: crypto.randomUUID(),
			position: new Float32Array([
				options.x ?? Math.random() * this.params.worldWidth,
				options.y ?? Math.random() * this.params.worldHeight,
			]),
			velocity: new Float32Array([0, 0]),
			energy: options.energy ?? 100,
			species: options.species ?? 1,
			size: options.size ?? 1.0,
			genes: new Float32Array(
				options.genes ?? [
					Math.random(), // Speed
					Math.random(), // Sense range
					Math.random(), // Metabolism
					Math.random(), // Additional trait
				],
			),
			neuralId: crypto.randomUUID(),
		};

		this.entities.set(entity.id, entity);
		return entity;
	}

	/**
	 * Handle reproduction between two entities
	 */
	async reproduce(parent1Id, parent2Id) {
		const parent1 = this.entities.get(parent1Id);
		const parent2 = this.entities.get(parent2Id);

		if (!parent1 || !parent2) {
			throw new Error('Parent entities not found');
		}

		if (parent1.species !== parent2.species) {
			throw new Error('Cannot reproduce between different species');
		}

		// Get parent neural networks
		const network1 = this.networks.get(parent1.neural);
		const network2 = this.networks.get(parent2.neural);

		if (!network1 || !network2) {
			throw new Error('Parent neural networks not found');
		}

		// Create child network through crossover and mutation
		const childNetwork = NeuralNetwork.crossover(network1, network2);
		if (this.params.enableMutation) {
			childNetwork.mutate(0.1, 0.2);
		}

		// Create child with inherited and potentially mutated genes
		const child = this.spawnLifeform({
			x: (parent1.position[0] + parent2.position[0]) / 2,
			y: (parent1.position[1] + parent2.position[1]) / 2,
			species: parent1.species,
			energy: 50, // Start with half energy
			speed: this.mutateGene((parent1.genes[0] + parent2.genes[0]) / 2),
			senseRange: this.mutateGene((parent1.genes[1] + parent2.genes[1]) / 2),
			metabolism: this.mutateGene((parent1.genes[2] + parent2.genes[2]) / 2),
		});

		// Store child's neural network
		this.networks.set(child.neural, childNetwork);

		// Parents lose energy from reproduction
		parent1.energy -= 30;
		parent2.energy -= 30;

		return child;
	}

	/**
	 * Apply random mutation to a gene value
	 */
	mutateGene(value) {
		if (this.params.enableMutation) {
			const mutationChance = 0.1;
			const mutationRange = 0.2; // 20% max change
			if (Math.random() < mutationChance) {
				const mutation = 1 + (Math.random() * 2 - 1) * mutationRange;
				return value * mutation;
			}
		}
		return value;
	}

	/**
	 * Get the current state of an entity
	 */
	getLifeformState(id) {
		const entity = this.entities.get(id);
		if (!entity) {
			return null;
		}
		return {
			id: entity.id,
			type: this.getLifeformType(entity.species),
			position: entity.position,
			energy: entity.energy,
			species: entity.species,
			genes: {
				speed: entity.genes[0],
				senseRange: entity.genes[1],
				metabolism: entity.genes[2],
				size: entity.genes[3],
			},
			maturity: entity.age > 100 ? 1.0 : entity.age / 100,
		};
	}

	/**
	 * Get lifeform type from species number
	 */
	getLifeformType(species) {
		switch (species) {
			case 0:
				return 'plant';
			case 1:
				return 'herbivore';
			case 2:
				return 'predator';
			default:
				return 'unknown';
		}
	}

	/**
	 * Check if two lifeforms can reproduce
	 */
	canReproduce(entity1, entity2) {
		// Must be same species
		if (entity1.species !== entity2.species) {
			return false;
		}

		// Must be mature
		if (entity1.age < 100 || entity2.age < 100) {
			return false;
		}

		// Must have enough energy
		if (entity1.energy < 50 || entity2.energy < 50) {
			return false;
		}

		// Must be close enough
		const dx = entity1.position[0] - entity2.position[0];
		const dy = entity1.position[1] - entity2.position[1];
		const distSq = dx * dx + dy * dy;
		return distSq <= 100; // Within 10 units
	}

	/**
	 * Perform genetic crossover between parents
	 */
	performGeneticCrossover(genes1, genes2) {
		const childGenes = new Float32Array(4);
		for (let i = 0; i < 4; i++) {
			// 50% chance to inherit from each parent
			childGenes[i] = Math.random() < 0.5 ? genes1[i] : genes2[i];
		}
		return childGenes;
	}

	/**
	 * Apply random mutations to genes
	 */
	applyMutations(genes) {
		const MUTATION_RATE = 0.1; // 10% chance per gene
		const MAX_MUTATION = 0.2; // Max 20% change

		for (let i = 0; i < genes.length; i++) {
			if (Math.random() < MUTATION_RATE) {
				// Apply random mutation within bounds
				const mutation = (Math.random() * 2 - 1) * MAX_MUTATION;
				genes[i] *= 1 + mutation;
			}
		}
	}

	/**
	 * Handle predator-prey interactions
	 */
	handlePredation(predator, prey) {
		// Only carnivores can be predators
		if (predator.species !== 2) {
			return;
		}

		// Check if prey is within range
		const dx = predator.position[0] - prey.position[0];
		const dy = predator.position[1] - prey.position[1];
		const distSq = dx * dx + dy * dy;

		// Attack range based on predator size
		const attackRange = predator.size * 10;

		if (distSq <= attackRange * attackRange) {
			// Calculate attack success based on predator's strength (gene[3])
			const attackStrength = predator.genes[3];
			const defenseStrength = prey.size;

			// Attack succeeds if predator is stronger
			if (attackStrength > defenseStrength) {
				// Transfer energy from prey to predator
				const energyGained = Math.min(prey.energy, 50);
				predator.energy += energyGained;
				prey.energy = 0; // Prey dies
			}
		}
	}

	/**
	 * Get current simulation statistics
	 */
	getStats() {
		return {
			...this.stats,
			resources: this.resourceManager.getStats(),
		};
	}
}

export { CoreSimulation };