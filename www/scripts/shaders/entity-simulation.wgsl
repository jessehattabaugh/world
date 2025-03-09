// Entity Simulation Compute Shader
// This shader handles the physics and behavior of entities in the ecosystem

// Include common utility functions and data structures
#include "common/entity-types.wgsl"
#include "common/random.wgsl"
#include "common/math.wgsl"

// Input and output entity buffers
@group(0) @binding(0) var<storage, read> inputEntities: array<Entity>;
@group(0) @binding(1) var<storage, read_write> outputEntities: array<Entity>;
@group(0) @binding(2) var<uniform> params: SimParams;
@group(0) @binding(3) var<storage, read> neuralNetworks: array<f32>;

// Neural network constants
const INPUT_SIZE: u32 = 4u;
const HIDDEN_SIZE: u32 = 8u;
const OUTPUT_SIZE: u32 = 4u;

// Neural network activation function (ReLU)
fn activate(x: f32) -> f32 {
    return max(0.0, x);
}

// Process neural network for an entity
fn processNeuralNetwork(entity: Entity, entityIndex: u32) -> vec4f {
    var hidden: array<f32, 8>; // Hidden layer neurons
    var output: vec4f;         // Output layer neurons

    // Calculate network data offset for this entity
    let networkOffset = entityIndex * (
        INPUT_SIZE * HIDDEN_SIZE +    // Input->Hidden weights
        HIDDEN_SIZE * OUTPUT_SIZE +   // Hidden->Output weights
        HIDDEN_SIZE +                 // Hidden biases
        OUTPUT_SIZE                   // Output biases
    );

    // Prepare inputs
    let nearestFood = findNearestFood(entity);
    let nearestPredator = findNearestPredator(entity);

    let inputs = array<f32, 4>(
        nearestFood.x,        // Distance to food
        nearestFood.y,        // Angle to food
        nearestPredator.x,    // Distance to predator
        nearestPredator.y     // Angle to predator
    );

    // Process hidden layer
    for (var i = 0u; i < HIDDEN_SIZE; i++) {
        var sum = 0.0;
        for (var j = 0u; j < INPUT_SIZE; j++) {
            let weight = neuralNetworks[networkOffset + i * INPUT_SIZE + j];
            sum += inputs[j] * weight;
        }
        // Add bias
        sum += neuralNetworks[
            networkOffset +
            INPUT_SIZE * HIDDEN_SIZE +
            HIDDEN_SIZE * OUTPUT_SIZE +
            i
        ];
        hidden[i] = activate(sum);
    }

    // Process output layer
    for (var i = 0u; i < OUTPUT_SIZE; i++) {
        var sum = 0.0;
        for (var j = 0u; j < HIDDEN_SIZE; j++) {
            let weight = neuralNetworks[
                networkOffset +
                INPUT_SIZE * HIDDEN_SIZE +
                j * OUTPUT_SIZE + i
            ];
            sum += hidden[j] * weight;
        }
        // Add bias
        sum += neuralNetworks[
            networkOffset +
            INPUT_SIZE * HIDDEN_SIZE +
            HIDDEN_SIZE * OUTPUT_SIZE +
            HIDDEN_SIZE +
            i
        ];
        // Store in output vector
        output[i] = activate(sum);
    }

    return output;
}

// Find nearest food source
fn findNearestFood(entity: Entity) -> vec2f {
    var minDist = 1000000.0;
    var foodDir = vec2f(0.0, 0.0);

    // Search through entities for food
    for (var i = 0u; i < arrayLength(&inputEntities); i++) {
        let other = inputEntities[i];
        if (other.species == 0u) { // Food/plant
            let diff = other.position - entity.position;
            let dist = length(diff);
            if (dist < minDist && dist > 0.0) {
                minDist = dist;
                foodDir = normalize(diff);
            }
        }
    }

    return vec2f(minDist, dirToAngle(foodDir));
}

// Find nearest predator
fn findNearestPredator(entity: Entity) -> vec2f {
    var minDist = 1000000.0;
    var predDir = vec2f(0.0, 0.0);

    // Search through entities for predators
    for (var i = 0u; i < arrayLength(&inputEntities); i++) {
        let other = inputEntities[i];
        if (other.species > entity.species) { // Higher species number = predator
            let diff = other.position - entity.position;
            let dist = length(diff);
            if (dist < minDist && dist > 0.0) {
                minDist = dist;
                predDir = normalize(diff);
            }
        }
    }

    return vec2f(minDist, dirToAngle(predDir));
}

// Update entry point - handles entity behavior and decisions
@compute @workgroup_size(WORKGROUP_SIZE)
fn update(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let idx = global_id.x;

    // Make sure we don't go out of bounds
    if (idx >= arrayLength(&inputEntities)) {
        return;
    }

    // Copy the entity from input to output
    var entity = inputEntities[idx];

    // Create a unique seed for randomness
    let random_seed = params.frameCount * 1000u + idx;

    // Get neural network decisions
    let decisions = processNeuralNetwork(entity, idx);

    // Apply neural network outputs
    let moveDir = angleToDir(decisions[0] * TWO_PI);    // Movement direction
    let moveSpeed = decisions[1] * 5.0;                 // Movement speed
    let reproduce = decisions[2];                       // Reproduction desire
    let attack = decisions[3];                         // Attack desire

    // Update velocity based on neural network output
    entity.velocity += moveDir * moveSpeed * params.deltaTime;

    // Apply species-specific behavior
    switch(entity.species) {
        case 0u: { // Plants
            // Plants slowly generate energy through photosynthesis
            if (params.enableReproduction != 0u) {
                entity.energy += params.plantGrowthRate * params.deltaTime;
            }
            break;
        }
        case 1u: { // Herbivores
            // Herbivores move around and consume energy
            entity.energy -= length(entity.velocity) * 0.2 * params.deltaTime;
            break;
        }
        default: { // Carnivores
            // Carnivores move faster and consume more energy
            entity.energy -= length(entity.velocity) * 0.3 * params.deltaTime;
            break;
        }
    }

    // Write updated entity back to output
    outputEntities[idx] = entity;
}

// Physics entry point - handles physical simulation
@compute @workgroup_size(WORKGROUP_SIZE)
fn physics(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let idx = global_id.x;

    // Make sure we don't go out of bounds
    if (idx >= arrayLength(&inputEntities)) {
        return;
    }

    // Copy the entity from input to output
    var entity = inputEntities[idx];

    // Apply physics
    entity.position += entity.velocity * params.deltaTime;

    // Constrain to world bounds (bounce off edges)
    if (entity.position.x < 0.0) {
        entity.position.x = 0.0;
        entity.velocity.x = -entity.velocity.x * 0.8;
    }
    if (entity.position.x > params.worldWidth) {
        entity.position.x = params.worldWidth;
        entity.velocity.x = -entity.velocity.x * 0.8;
    }
    if (entity.position.y < 0.0) {
        entity.position.y = 0.0;
        entity.velocity.y = -entity.velocity.y * 0.8;
    }
    if (entity.position.y > params.worldHeight) {
        entity.position.y = params.worldHeight;
        entity.velocity.y = -entity.velocity.y * 0.8;
    }

    // Apply friction/drag
    entity.velocity *= 0.98;

    // Prevent negative energy
    entity.energy = max(entity.energy, 0.0);

    // Write the updated entity back to the output buffer
    outputEntities[idx] = entity;
}