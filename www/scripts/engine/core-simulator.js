/**
 * Core Simulator
 */
export class CoreSimulator {
    constructor(width = 800, height = 600) {
        this.width = width;
        this.height = height;
        this.stats = {
            entityCount: 0,
            foodCount: 0,
            avgEnergy: 0,
            avgLifespan: 0
        };

        // Entity management
        this.nextEntityId = 0;
        this.entities = new Map();
        this.neuralNetworks = new Map();

        // Initialize buffers
        this.lifeformBuffer = {
            stride: 32, // 8 floats per entity
            capacity: 1024,
            attributes: {
                position: { offset: 0, size: 2 },
                velocity: { offset: 8, size: 2 },
                energy: { offset: 16, size: 1 },
                species: { offset: 20, size: 1 },
                genes: { offset: 24, size: 4 }
            }
        };

        // Create GPU buffers
        this.createGPUBuffers();
    }

    /**
     * Create GPU buffers for simulation
     */
    createGPUBuffers() {
        // Implementation will be added once WebGPU is properly initialized
    }

    /**
     * Spawn a new lifeform
     */
    spawnLifeform(x, y, genes = null) {
        const id = this.nextEntityId++;

        // Default genes if none provided
        const defaultGenes = {
            speed: 1.0 + Math.random(),
            senseRange: 30 + Math.random() * 40,
            metabolism: 0.8 + Math.random() * 0.4,
            strength: 0.5 + Math.random()
        };

        const entity = {
            id,
            position: { x, y },
            velocity: { x: 0, y: 0 },
            energy: 100,
            species: 1, // 1 = herbivore, 2 = carnivore
            size: 10,
            genes: genes || defaultGenes,
            neuralId: crypto.randomUUID()
        };

        // Create neural network for entity
        this.createNeuralNetwork(entity.neuralId);

        this.entities.set(id, entity);
        this.stats.entityCount++;

        return entity;
    }

    /**
     * Get state of a specific lifeform
     */
    getLifeformState(id) {
        const entity = this.entities.get(id);
        if (!entity) {return null;}

        return {
            position: { ...entity.position },
            velocity: { ...entity.velocity },
            energy: entity.energy,
            genes: { ...entity.genes }
        };
    }

    /**
     * Create neural network for an entity
     */
    createNeuralNetwork(neuralId) {
        const network = {
            inputLayer: [
                'nearestFoodDistance',
                'nearestFoodDirection',
                'nearestPredatorDistance',
                'nearestPredatorDirection',
                'energy',
                'random'
            ],
            hiddenLayers: [
                new Array(8).fill(0)
            ],
            outputLayer: [
                'moveDirection',
                'moveSpeed',
                'eat',
                'reproduce'
            ],
            weights: {
                inputHidden: Array(48).fill(0).map(() => {return Math.random() * 2 - 1}),
                hiddenOutput: Array(32).fill(0).map(() => {return Math.random() * 2 - 1})
            }
        };

        this.neuralNetworks.set(neuralId, network);
        return network;
    }

    /**
     * Get neural network for an entity
     */
    getNeuralNetwork(entityId) {
        const entity = this.entities.get(entityId);
        if (!entity) {return null;}
        return this.neuralNetworks.get(entity.neuralId);
    }

    /**
     * Spawn food at location
     */
    spawnFood(x, y) {
        const id = this.nextEntityId++;
        const food = {
            id,
            position: { x, y },
            energy: 50,
            species: 0, // 0 = food
            size: 5
        };

        this.entities.set(id, food);
        this.stats.foodCount++;

        return food;
    }

    /**
     * Handle reproduction between two entities
     */
    async reproduce(parent1Id, parent2Id) {
        const parent1 = this.entities.get(parent1Id);
        const parent2 = this.entities.get(parent2Id);

        if (!parent1 || !parent2 || parent1.species !== parent2.species) {
            return null;
        }

        // Create child genes through crossover and mutation
        const childGenes = {};
        for (const gene in parent1.genes) {
            // Crossover
            const parentGene = Math.random() < 0.5 ?
                parent1.genes[gene] : parent2.genes[gene];

            // Mutation
            const mutationRate = 0.1;
            const mutationStrength = 0.2;
            const mutation = Math.random() < mutationRate ?
                (Math.random() * 2 - 1) * mutationStrength : 0;

            childGenes[gene] = parentGene * (1 + mutation);
        }

        // Spawn child between parents
        const childX = (parent1.position.x + parent2.position.x) / 2;
        const childY = (parent1.position.y + parent2.position.y) / 2;

        const child = this.spawnLifeform(childX, childY, childGenes);

        // Energy cost for reproduction
        parent1.energy -= 30;
        parent2.energy -= 30;

        return child;
    }

    /**
     * Perform one simulation step
     */
    async step() {
        // Update neural networks
        for (const entity of this.entities.values()) {
            if (entity.species === 0) {continue;} // Skip food

            const network = this.getNeuralNetwork(entity.id);
            if (!network) {continue;}

            // Process network inputs
            const nearestFood = this.findNearestFood(entity);
            const nearestPredator = this.findNearestPredator(entity);

            const inputs = [
                nearestFood?.distance || 1000,
                nearestFood?.direction || 0,
                nearestPredator?.distance || 1000,
                nearestPredator?.direction || 0,
                entity.energy / 100,
                Math.random()
            ];

            // Forward pass (simplified for now)
            const hiddenLayer = network.weights.inputHidden.map((w, i) =>
                {return Math.max(0, inputs[Math.floor(i / 8)] * w)}
            );

            const outputs = network.weights.hiddenOutput.map((w, i) =>
                {return 1 / (1 + Math.exp(-hiddenLayer[Math.floor(i / 4)] * w))}
            );

            // Apply outputs
            const moveAngle = outputs[0] * Math.PI * 2;
            const speed = outputs[1] * entity.genes.speed;

            entity.velocity.x = Math.cos(moveAngle) * speed;
            entity.velocity.y = Math.sin(moveAngle) * speed;

            // Update position
            entity.position.x += entity.velocity.x;
            entity.position.y += entity.velocity.y;

            // Constrain to bounds
            entity.position.x = Math.max(0, Math.min(this.width, entity.position.x));
            entity.position.y = Math.max(0, Math.min(this.height, entity.position.y));

            // Update energy
            const movementCost = Math.sqrt(
                entity.velocity.x * entity.velocity.x +
                entity.velocity.y * entity.velocity.y
            ) * entity.genes.metabolism;

            entity.energy -= movementCost;

            // Handle death
            if (entity.energy <= 0) {
                this.entities.delete(entity.id);
                this.stats.entityCount--;
            }
        }

        // Update statistics
        this.updateStats();
    }

    /**
     * Find nearest food to an entity
     */
    findNearestFood(entity) {
        let nearest = null;
        let minDist = Infinity;

        for (const food of this.entities.values()) {
            if (food.species !== 0) {continue;} // Skip non-food

            const dx = food.position.x - entity.position.x;
            const dy = food.position.y - entity.position.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDist) {
                minDist = distSq;
                nearest = {
                    distance: Math.sqrt(distSq),
                    direction: Math.atan2(dy, dx)
                };
            }
        }

        return nearest;
    }

    /**
     * Find nearest predator to an entity
     */
    findNearestPredator(entity) {
        if (entity.species === 2) {return null;} // Predators don't track other predators

        let nearest = null;
        let minDist = Infinity;

        for (const other of this.entities.values()) {
            if (other.species !== 2) {continue;} // Skip non-predators

            const dx = other.position.x - entity.position.x;
            const dy = other.position.y - entity.position.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDist) {
                minDist = distSq;
                nearest = {
                    distance: Math.sqrt(distSq),
                    direction: Math.atan2(dy, dx)
                };
            }
        }

        return nearest;
    }

    /**
     * Update simulation statistics
     */
    updateStats() {
        let totalEnergy = 0;
        let totalLifeforms = 0;

        for (const entity of this.entities.values()) {
            if (entity.species === 0) {continue;} // Skip food
            totalEnergy += entity.energy;
            totalLifeforms++;
        }

        this.stats.avgEnergy = totalLifeforms > 0 ?
            totalEnergy / totalLifeforms : 0;
    }
}