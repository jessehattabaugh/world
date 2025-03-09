/**
 * Tile Worker
 * Handles processing of entities within a tile boundary
 */

import { NeuralNetwork } from '../neural-network.js';

// Use a shared resource manager instance
let resourceManager = null;
const neuralNetworks = new Map();

// Reusable arrays to avoid GC
const REUSE = {
    processed: new Map(),
    nearby: []
};

// Constants
const INTERACTION_RANGE = 50;
const REPRODUCTION_ENERGY = 50;
const MATURITY_THRESHOLD = 1.0;
const MUTATION_RATE = 0.1;

self.onmessage = async ({ data: { type, tile, timestamp } }) => {
    if (type !== 'process') {return;}

    // Initialize resource manager if needed
    resourceManager ??= new ResourceManager();

    // Process tile and send results
    const results = await processTile(tile, timestamp);
    self.postMessage({ tileId: tile.id, results });
};

async function processTile(tile, timestamp) {
    const {processed} = REUSE;
    processed.clear();

    // Update neural networks in batches
    for (const entity of tile.entities) {
        if (!entity.neuralId) {continue;}

        // Get or create neural network
        let network = neuralNetworks.get(entity.neuralId);
        if (!network) {
            network = new NeuralNetwork();
            neuralNetworks.set(entity.neuralId, network);
        }

        // Prepare normalized inputs
        const input = new Float32Array([
            entity.position[0] / tile.bounds.width,
            entity.position[1] / tile.bounds.height,
            entity.energy / 100.0,
            entity.species / 2.0
        ]);

        // Process decisions
        const decisions = network.forward(input);
        processed.set(entity.id, { ...entity, decisions });
    }

    // Process interactions in batches
    for (const entity of processed.values()) {
        if (entity.species === 0) {continue;} // Skip plants

        // Find nearby entities efficiently
        const nearby = findNearbyEntities(entity, processed);

        // Handle interactions based on species
        if (entity.species === 2) { // Predator
            for (const prey of nearby) {
                if (prey.species === 1) { // Herbivore
                    handlePredation(entity, prey);
                }
            }
        }

        // Handle reproduction with first compatible mate
        const mate = nearby.find(other => {return canReproduce(entity, other)});
        if (mate) {
            const child = reproduce(entity, mate);
            if (child) {processed.set(child.id, child);}
        }
    }

    return Array.from(processed.values());
}

function findNearbyEntities(entity, entities) {
    const {nearby} = REUSE;
    nearby.length = 0;
    const rangeSq = INTERACTION_RANGE * INTERACTION_RANGE;

    for (const other of entities.values()) {
        if (other.id === entity.id) {continue;}

        const dx = other.position[0] - entity.position[0];
        const dy = other.position[1] - entity.position[1];
        const distSq = dx * dx + dy * dy;

        if (distSq <= rangeSq) {nearby.push(other);}
    }

    return nearby;
}

function handlePredation(predator, prey) {
    const attackStrength = predator.genes[3];
    const defenseStrength = prey.genes[3];

    if (attackStrength > defenseStrength) {
        const energyGained = Math.min(prey.energy, 50);
        predator.energy += energyGained;
        prey.energy = 0;
    }
}

function canReproduce(entity1, entity2) {
    return (
        entity1.species === entity2.species &&
        entity1.energy >= REPRODUCTION_ENERGY &&
        entity2.energy >= REPRODUCTION_ENERGY &&
        entity1.maturity >= MATURITY_THRESHOLD &&
        entity2.maturity >= MATURITY_THRESHOLD
    );
}

function reproduce(parent1, parent2) {
    // Create child genes through crossover and mutation
    const childGenes = new Float32Array(4);
    for (let i = 0; i < 4; i++) {
        childGenes[i] = Math.random() < 0.5 ? parent1.genes[i] : parent2.genes[i];
        if (Math.random() < MUTATION_RATE) {
            childGenes[i] *= (1 + (Math.random() * 0.4 - 0.2));
        }
    }

    // Create child entity
    const child = {
        id: crypto.randomUUID(),
        position: new Float32Array([
            (parent1.position[0] + parent2.position[0]) / 2,
            (parent1.position[1] + parent2.position[1]) / 2
        ]),
        velocity: new Float32Array([0, 0]),
        energy: 50,
        species: parent1.species,
        genes: childGenes,
        maturity: 0,
        neuralId: crypto.randomUUID()
    };

    // Create child neural network
    const network1 = neuralNetworks.get(parent1.neuralId);
    const network2 = neuralNetworks.get(parent2.neuralId);
    if (network1 && network2) {
        const childNetwork = NeuralNetwork.crossover(network1, network2, MUTATION_RATE);
        neuralNetworks.set(child.neuralId, childNetwork);
    }

    // Parents lose energy from reproduction
    parent1.energy -= 30;
    parent2.energy -= 30;

    return child;
}