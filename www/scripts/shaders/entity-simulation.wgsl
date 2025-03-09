// Entity Simulation Compute Shader
// This shader handles the physics and behavior of entities in the ecosystem

struct Entity {
  position: vec2f,  // x, y position
  velocity: vec2f,  // velocity vector
  energy: f32,      // current energy level
  species: u32,     // species identifier
  size: f32,        // entity size
  padding: f32      // padding for alignment (32 bytes total)
}

// Input and output entity buffers
@group(0) @binding(0) var<storage, read> inputEntities: array<Entity>;
@group(0) @binding(1) var<storage, read_write> outputEntities: array<Entity>;

// Simulation parameters
struct SimParams {
  deltaTime: f32,   // Time since last frame
  frameCount: u32,  // Current frame number
  worldWidth: u32,  // Width of the simulation world
  worldHeight: u32, // Height of the simulation world
}

@group(0) @binding(2) var<uniform> params: SimParams;

// Simple random number generator
fn rand(seed: u32) -> f32 {
  let a = 1664525u;
  let c = 1013904223u;
  let m = 4294967296u; // 2^32

  // Use frameCount and seed to create varied results
  let new_seed = (a * seed + c) % m;
  return f32(new_seed) / f32(m);
}

// Random value in a range
fn randInRange(seed: u32, min: f32, max: f32) -> f32 {
  return min + rand(seed) * (max - min);
}

// Main compute shader entry point
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;

  // Make sure we don't go out of bounds
  if (idx >= arrayLength(&inputEntities)) {
    return;
  }

  // Copy the entity from input to output
  var entity = inputEntities[idx];

  // Create a unique seed for randomness
  let random_seed = params.frameCount * 1000u + idx;

  // Apply simple physics and behavior

  // 1. Add some random movement (simulating decision-making)
  if (rand(random_seed) < 0.05) { // Occasionally change direction
    let random_angle = rand(random_seed + 1u) * 6.28318; // 2*PI
    let random_force = 5.0 * rand(random_seed + 2u);

    entity.velocity.x += cos(random_angle) * random_force;
    entity.velocity.y += sin(random_angle) * random_force;
  }

  // 2. Apply velocity with deltaTime
  entity.position.x += entity.velocity.x * params.deltaTime;
  entity.position.y += entity.velocity.y * params.deltaTime;

  // 3. Constrain to world bounds (bounce off edges)
  if (entity.position.x < 0.0) {
    entity.position.x = 0.0;
    entity.velocity.x = -entity.velocity.x * 0.8;
  }
  if (entity.position.x > f32(params.worldWidth)) {
    entity.position.x = f32(params.worldWidth);
    entity.velocity.x = -entity.velocity.x * 0.8;
  }

  if (entity.position.y < 0.0) {
    entity.position.y = 0.0;
    entity.velocity.y = -entity.velocity.y * 0.8;
  }
  if (entity.position.y > f32(params.worldHeight)) {
    entity.position.y = f32(params.worldHeight);
    entity.velocity.y = -entity.velocity.y * 0.8;
  }

  // 4. Apply friction/drag
  entity.velocity.x *= 0.98;
  entity.velocity.y *= 0.98;

  // 5. Consume energy over time
  entity.energy -= 0.1 * params.deltaTime;

  // 6. Prevent negative energy
  if (entity.energy < 0.0) {
    entity.energy = 0.0;
  }

  // Write the updated entity back to the output buffer
  outputEntities[idx] = entity;
}