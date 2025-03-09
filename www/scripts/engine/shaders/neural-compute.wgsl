// Neural Network and Entity Data Structures
struct NeuralNet {
    inputWeights: array<vec4f, 8>,    // 4x8 input->hidden weights
    outputWeights: array<vec4f, 2>,    // 8x4 hidden->output weights (packed)
    hiddenBiases: vec4f,              // 8 hidden biases (packed in 2 vec4)
    outputBiases: vec4f               // 4 output biases
}

struct SimParams {
    deltaTime: f32,
    frameCount: u32,
    worldWidth: f32,
    worldHeight: f32,
    plantGrowthRate: f32,
    herbivoreSpeed: f32,
    carnivoreSpeed: f32,
    enableMutation: u32,
    enableReproduction: u32,
    randomSeed: u32
}

struct Entity {
    position: vec2f,
    velocity: vec2f,
    energy: f32,
    species: u32,
    size: f32,
    genes: vec4f,
    neuralId: u32,
    padding: f32
}

// Activation functions
fn relu(x: f32) -> f32 {
    return max(0.0, x);
}

fn sigmoid(x: f32) -> f32 {
    return 1.0 / (1.0 + exp(-x));
}

// Neural network forward pass
fn processNeuralNetwork(input: vec4f, net: NeuralNet) -> vec4f {
    var hidden: array<f32, 8>;

    // Input -> Hidden layer
    for (var i = 0u; i < 8u; i++) {
        hidden[i] = dot(input, net.inputWeights[i]) + net.hiddenBiases[i % 4];
        hidden[i] = relu(hidden[i]);
    }

    // Hidden -> Output layer
    var output: vec4f;
    for (var i = 0u; i < 4u; i++) {
        var sum = 0.0;
        // Each output connects to all hidden nodes
        for (var j = 0u; j < 8u; j += 4u) {
            let weights = net.outputWeights[i/4];
            sum += hidden[j + i%4] * weights[i%4];
        }
        output[i] = sigmoid(sum + net.outputBiases[i]);
    }

    return output;
}

@group(0) @binding(0) var<storage, read> inputEntities: array<Entity>;
@group(0) @binding(1) var<storage, read_write> outputEntities: array<Entity>;
@group(0) @binding(2) var<uniform> params: SimParams;
@group(0) @binding(3) var<storage, read> neuralNets: array<NeuralNet>;

// Compute shader entry point
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

    // Prepare network inputs
    let input = vec4f(
        entity.position.x / params.worldWidth,  // Normalized x position
        entity.position.y / params.worldHeight, // Normalized y position
        entity.energy / 100.0,                  // Normalized energy
        f32(entity.species) / 2.0              // Normalized species type
    );

    // Process neural network
    let decisions = processNeuralNetwork(input, network);

    // Apply network outputs
    let moveSpeed = entity.genes[0] * (
        entity.species == 1u ? params.herbivoreSpeed : params.carnivoreSpeed
    );

    // Movement direction from first two outputs
    entity.velocity = vec2f(
        (decisions[0] * 2.0 - 1.0) * moveSpeed,
        (decisions[1] * 2.0 - 1.0) * moveSpeed
    );

    // Update energy based on metabolism and movement
    let movementCost = length(entity.velocity) * entity.genes[2] * params.deltaTime;
    entity.energy -= movementCost;

    // Store updated entity
    outputEntities[index] = entity;
}