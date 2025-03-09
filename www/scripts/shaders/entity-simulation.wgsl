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

// Main compute shader entry point
@compute @workgroup_size(WORKGROUP_SIZE)
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
    let random_dir = randDir2D(random_seed + 1u);
    let random_force = 5.0 * rand(random_seed + 2u);

    entity.velocity += random_dir * random_force;
  }

  // 2. Apply velocity with deltaTime
  entity.position += entity.velocity * params.deltaTime;

  // 3. Constrain to world bounds (bounce off edges)
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

  // 4. Apply friction/drag
  entity.velocity *= 0.98;

  // 5. Process entity behavior based on species
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
      entity.energy -= 0.2 * params.deltaTime;
      break;
    }
    default: { // Carnivores
      // Carnivores move faster and consume more energy
      entity.energy -= 0.3 * params.deltaTime;
      break;
    }
  }

  // 6. Prevent negative energy
  entity.energy = max(entity.energy, 0.0);

  // Write the updated entity back to the output buffer
  outputEntities[idx] = entity;
}