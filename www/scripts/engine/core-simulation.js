/**
 * Core Simulation Engine
 * 
 * This module implements the core simulation logic for the ecosystem,
 * handling entity behavior, genetics, and interactions through WebGPU.
 */

import { ResourceManager } from './resource-manager.js';
import { NeuralNetwork } from './neural-network.js';

export class CoreSimulation {
    /**
     * Create a new simulation instance
     * @param {WebGPUManager} gpuManager - WebGPU manager instance
     */
    constructor(gpuManager) {
        this.gpuManager = gpuManager;
        this.isInitialized = false;
        
        // Simulation state
        this.entities = new Map();
        this.nextEntityId = 0;
        
        // WebGPU resources
        this.buffers = {
            input: null,
            output: null,
            params: null,
            neuralNets: null
        };
        
        this.bindGroups = {
            simulation: null
        };
        
        // Simulation parameters
        this.params = {
            deltaTime: 0,
            frameCount: 0,
            worldWidth: 800,
            worldHeight: 600,
            plantGrowthRate: 1.0,
            herbivoreSpeed: 2.0,
            carnivoreSpeed: 3.0,
            enableMutation: 1,
            enableReproduction: 1,
            randomSeed: Math.random() * 0xFFFFFFFF
        };
        
        // Statistics
        this.stats = {
            entityCount: 0,
            networkCount: 0
        };

        // Add ResourceManager
        this.resourceManager = new ResourceManager();

        // Neural networks for entities
        this.networks = new Map();
    }

    /**
     * Initialize the simulation
     */
    async initialize() {
        if (!this.gpuManager.initialized) {
            throw new Error('WebGPU manager must be initialized first');
        }

        // Create initial buffers
        const maxEntities = 1000;
        const entityBufferSize = maxEntities * 48; // 48 bytes per entity
        const networkBufferSize = maxEntities * 
            (4 * 8 +      // Input->Hidden weights (4×8)
             8 * 4 +      // Hidden->Output weights (8×4)
             8 + 4) * 4;  // Biases (8 hidden + 4 output) * 4 bytes

        // Create entity buffers
        this.buffers.input = this.gpuManager.createBuffer({
            label: 'Entity Input Buffer',
            size: entityBufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        this.buffers.output = this.gpuManager.createBuffer({
            label: 'Entity Output Buffer',
            size: entityBufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        // Create neural network buffer
        this.buffers.neuralNets = this.gpuManager.createBuffer({
            label: 'Neural Network Buffer',
            size: networkBufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        // Create parameter buffer
        this.buffers.params = this.gpuManager.createBuffer({
            label: 'Simulation Params Buffer',
            size: 48, // 12 x 4-byte values
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        // Create bind group with neural network buffer
        this.bindGroups.simulation = this.gpuManager.createSimulationBindGroup(
            this.buffers
        );

        this.isInitialized = true;
    }

    /**
     * Spawn a new entity
     * @param {Object} options - Entity options
     */
    spawnLifeform(options = {}) {
        const entity = {
            id: this.nextEntityId++,
            position: new Float32Array([
                options.x ?? Math.random() * this.params.worldWidth,
                options.y ?? Math.random() * this.params.worldHeight
            ]),
            velocity: new Float32Array([0, 0]),
            energy: options.energy ?? 100,
            species: options.species ?? 0,
            size: options.size ?? 1.0,
            genes: new Float32Array([
                options.speed ?? 1.0,
                options.senseRange ?? 50,
                options.metabolism ?? 1.0,
                0.0  // Additional gene slot
            ]),
            neural: this.nextEntityId // Using entity ID as neural network ID
        };

        // Create neural network for entity
        const network = new NeuralNetwork();
        this.networks.set(entity.neural, network);
        this.stats.networkCount = this.networks.size;

        // Store entity
        this.entities.set(entity.id, entity);
        this.stats.entityCount = this.entities.size;

        return entity;
    }

    /**
     * Update simulation state
     * @param {number} deltaTime - Time since last update
     */
    async update(deltaTime) {
        if (!this.isInitialized) return;

        this.params.deltaTime = deltaTime;
        this.params.frameCount++;

        // Update resources first
        this.resourceManager.update(performance.now());

        // Update simulation parameters buffer
        this.gpuManager.device.queue.writeBuffer(
            this.buffers.params,
            0,
            new Float32Array([
                this.params.deltaTime,
                this.params.frameCount,
                this.params.worldWidth,
                this.params.worldHeight,
                this.params.plantGrowthRate,
                this.params.herbivoreSpeed,
                this.params.carnivoreSpeed,
                this.params.enableMutation,
                this.params.enableReproduction,
                this.params.randomSeed
            ])
        );

        // Convert entities to GPU buffer format
        const entityData = new Float32Array(this.entities.size * 12); // 12 floats per entity
        let i = 0;
        for (const entity of this.entities.values()) {
            entityData[i*12 + 0] = entity.position[0];
            entityData[i*12 + 1] = entity.position[1];
            entityData[i*12 + 2] = entity.velocity[0];
            entityData[i*12 + 3] = entity.velocity[1];
            entityData[i*12 + 4] = entity.energy;
            entityData[i*12 + 5] = entity.species;
            entityData[i*12 + 6] = entity.size;
            entityData[i*12 + 7] = entity.genes[0];
            entityData[i*12 + 8] = entity.genes[1];
            entityData[i*12 + 9] = entity.genes[2];
            entityData[i*12 + 10] = entity.genes[3];
            entityData[i*12 + 11] = entity.neural;
            i++;
        }

        // Upload entity data
        this.gpuManager.device.queue.writeBuffer(
            this.buffers.input,
            0,
            entityData
        );

        // Upload neural network data
        const networkData = new Float32Array(this.networks.size * 56);
        i = 0;
        for (const network of this.networks.values()) {
            const gpuData = network.toGPUFormat();
            networkData.set(gpuData, i * 56);
            i++;
        }
        this.gpuManager.device.queue.writeBuffer(
            this.buffers.neuralNets,
            0,
            networkData
        );

        // Run update compute shader (behavior/decisions)
        this.gpuManager.executeCompute(
            this.gpuManager.computePipeline.update,
            [this.bindGroups.simulation],
            [Math.ceil(this.entities.size / 64), 1, 1]
        );

        // Run physics compute shader
        this.gpuManager.executeCompute(
            this.gpuManager.computePipeline.physics,
            [this.bindGroups.simulation],
            [Math.ceil(this.entities.size / 64), 1, 1]
        );

        // Read back results
        const readbackBuffer = this.gpuManager.device.createBuffer({
            size: entityData.byteLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });

        const commandEncoder = this.gpuManager.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            this.buffers.output,
            0,
            readbackBuffer,
            0,
            entityData.byteLength
        );
        this.gpuManager.device.queue.submit([commandEncoder.finish()]);

        // Update entity states
        await readbackBuffer.mapAsync(GPUMapMode.READ);
        const data = new Float32Array(readbackBuffer.getMappedRange());
        i = 0;
        for (const entity of this.entities.values()) {
            entity.position[0] = data[i*12 + 0];
            entity.position[1] = data[i*12 + 1];
            entity.velocity[0] = data[i*12 + 2];
            entity.velocity[1] = data[i*12 + 3];
            entity.energy = data[i*12 + 4];
            // Species, size, and genes remain unchanged
            i++;

            // Remove dead entities
            if (entity.energy <= 0) {
                this.entities.delete(entity.id);
                this.networks.delete(entity.neural);
                this.stats.entityCount = this.entities.size;
                this.stats.networkCount = this.networks.size;
            }
        }
        readbackBuffer.unmap();

        // Handle interactions between entities
        for (const entity1 of this.entities.values()) {
            for (const entity2 of this.entities.values()) {
                if (entity1.id === entity2.id) continue;

                // Handle predator-prey interactions
                if (entity1.species === 2 && entity2.species === 1) {
                    this.handlePredation(entity1, entity2);
                }
            }
        }
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
            speed: this.mutateGene(
                (parent1.genes[0] + parent2.genes[0]) / 2
            ),
            senseRange: this.mutateGene(
                (parent1.genes[1] + parent2.genes[1]) / 2
            ),
            metabolism: this.mutateGene(
                (parent1.genes[2] + parent2.genes[2]) / 2
            )
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
        if (!entity) return null;
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
                size: entity.genes[3]
            },
            maturity: entity.age > 100 ? 1.0 : entity.age / 100
        };
    }

    /**
     * Get lifeform type from species number
     */
    getLifeformType(species) {
        switch (species) {
            case 0: return 'plant';
            case 1: return 'herbivore';
            case 2: return 'predator';
            default: return 'unknown';
        }
    }

    /**
     * Check if two lifeforms can reproduce
     */
    canReproduce(entity1, entity2) {
        // Must be same species
        if (entity1.species !== entity2.species) return false;
        
        // Must be mature
        if (entity1.age < 100 || entity2.age < 100) return false;
        
        // Must have enough energy
        if (entity1.energy < 50 || entity2.energy < 50) return false;
        
        // Must be close enough
        const dx = entity1.position[0] - entity2.position[0];
        const dy = entity1.position[1] - entity2.position[1];
        const distSq = dx * dx + dy * dy;
        return distSq <= 100; // Within 10 units
    }

    /**
     * Create offspring from two parent lifeforms
     */
    async reproduce(parent1Id, parent2Id) {
        const parent1 = this.entities.get(parent1Id);
        const parent2 = this.entities.get(parent2Id);
        
        if (!parent1 || !parent2) {
            throw new Error('Invalid parent IDs');
        }

        if (!this.canReproduce(parent1, parent2)) {
            throw new Error('Lifeforms cannot reproduce');
        }

        // Create child genes through crossover and mutation
        const childGenes = this.performGeneticCrossover(parent1.genes, parent2.genes);
        this.applyMutations(childGenes);

        // Position child between parents
        const childX = (parent1.position[0] + parent2.position[0]) / 2;
        const childY = (parent1.position[1] + parent2.position[1]) / 2;

        // Create child entity
        const child = this.spawnLifeform({
            x: childX,
            y: childY,
            species: parent1.species,
            genes: childGenes
        });

        // Parents lose energy from reproduction
        parent1.energy -= 30;
        parent2.energy -= 30;

        return child;
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
                genes[i] *= (1 + mutation);
            }
        }
    }

    /**
     * Handle predator-prey interactions
     */
    handlePredation(predator, prey) {
        // Only carnivores can be predators
        if (predator.species !== 2) return;

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
     * Get the current state of an entity
     */
    getLifeformState(id) {
        return this.entities.get(id);
    }

    /**
     * Get current simulation statistics
     */
    getStats() {
        return {
            ...this.stats,
            resources: this.resourceManager.getStats()
        };
    }
}