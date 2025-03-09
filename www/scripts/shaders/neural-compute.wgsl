#include "common/entity-types.wgsl"
#include "common/math.wgsl"
#include "common/random.wgsl"

// Optimized neural network data structure
struct NeuralNet {
    // Pack input weights in vec4 for better memory alignment
    inputWeights: array<vec4f, 8>,  // 4x8 input->hidden weights
    outputWeights: array<vec4f, 2>, // 8x4 hidden->output weights (packed)
    hiddenBiases: vec4f,           // 8 hidden biases (packed in 2 vec4)
    outputBiases: vec4f            // 4 output biases
}

// Optimized activation functions using fast approximations
fn fast_sigmoid(x: f32) -> f32 {
    return 0.5 * (x / (1.0 + abs(x)) + 1.0);
}

fn fast_tanh(x: f32) -> f32 {
    let x2 = x * x;
    return x * (27.0 + x2) / (27.0 + 9.0 * x2);
}

// Neural network forward pass with optimized memory access
fn processNeuralNetwork(input: vec4f, net: NeuralNet) -> vec4f {
    var hidden: vec4f;
    var hidden2: vec4f;

    // Input -> Hidden layer (first 4 neurons)
    // Use vec4 operations for better parallelization
    hidden = net.inputWeights[0] * input.x +
            net.inputWeights[1] * input.y +
            net.inputWeights[2] * input.z +
            net.inputWeights[3] * input.w;
    hidden = max(hidden + net.hiddenBiases, vec4f(0.0)); // Vectorized ReLU

    // Input -> Hidden layer (last 4 neurons)
    hidden2 = net.inputWeights[4] * input.x +
             net.inputWeights[5] * input.y +
             net.inputWeights[6] * input.z +
             net.inputWeights[7] * input.w;
    hidden2 = max(hidden2 + net.hiddenBiases, vec4f(0.0)); // Vectorized ReLU

    // Hidden -> Output layer
    // Pack operations into vec4 for parallel processing
    let output = vec4f(
        dot(hidden, net.outputWeights[0]) + dot(hidden2, net.outputWeights[1]),
        dot(hidden, net.outputWeights[0].wzyx) + dot(hidden2, net.outputWeights[1].wzyx),
        dot(hidden, net.outputWeights[0].yxwz) + dot(hidden2, net.outputWeights[1].yxwz),
        dot(hidden, net.outputWeights[0].zwxy) + dot(hidden2, net.outputWeights[1].zwxy)
    );

    // Apply fast sigmoid approximation
    return fast_sigmoid(output + net.outputBiases);
}

@group(0) @binding(0) var<storage, read> inputEntities: array<Entity>;
@group(0) @binding(1) var<storage, read_write> outputEntities: array<Entity>;
@group(0) @binding(2) var<uniform> params: SimParams;
@group(0) @binding(3) var<storage, read> neuralNets: array<NeuralNet>;

// Optimized compute shader entry point
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    let index = global_id.x;
    if (index >= arrayLength(&inputEntities)) {
        return;
    }

    var entity = inputEntities[index];

    // Skip plants and dead entities
    if (entity.species == 0u || entity.energy <= 0.0) {
        outputEntities[index] = entity;
        return;
    }

    // Get entity's neural network
    let network = neuralNets[entity.neuralId];

    // Prepare optimized network inputs
    let input = vec4f(
        entity.position.x / params.worldWidth,   // Normalized x position
        entity.position.y / params.worldHeight,  // Normalized y position
        entity.energy / 100.0,                   // Normalized energy
        f32(entity.species) / 2.0               // Normalized species type
    );

    // Process neural network efficiently
    let decisions = processNeuralNetwork(input, network);

    // Apply network outputs using vectorized operations
    let moveSpeed = entity.genes[0] * select(
        params.herbivoreSpeed,
        params.carnivoreSpeed,
        entity.species == 2u
    );

    // Update velocity using decisions
    entity.velocity = (decisions.xy * 2.0 - 1.0) * moveSpeed;

    // Update energy based on metabolism and movement
    let movementCost = length(entity.velocity) * entity.genes[2] * params.deltaTime;
    entity.energy -= movementCost;

    // Store updated entity
    outputEntities[index] = entity;
}