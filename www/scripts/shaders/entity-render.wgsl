// Entity Rendering Vertex/Fragment Shader
// This shader handles rendering entities in the ecosystem

// Include common utility functions and data structures
#include "common/entity-types.wgsl"
#include "common/math.wgsl"

// Viewport uniform containing camera/viewport info
struct Viewport {
  viewMatrix: mat4x4f,    // View matrix for camera
  projMatrix: mat4x4f,    // Projection matrix
  worldWidth: f32,        // World width
  worldHeight: f32,       // World height
}

// Vertex shader inputs
struct VertexInput {
  @location(0) position: vec2f,  // Unit circle position
  @location(1) instanceIndex: u32, // Instance ID
}

// Vertex shader outputs
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) energy: f32,
  @location(2) uv: vec2f,
}

// Bindings
@group(0) @binding(0) var<uniform> viewport: Viewport;
@group(0) @binding(1) var<storage, read> entities: array<Entity>;

// Vertex shader
@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;

  // Make sure we don't go out of bounds
  if (in.instanceIndex >= arrayLength(&entities)) {
    out.position = vec4f(0.0, 0.0, 0.0, 0.0);
    out.color = vec4f(0.0, 0.0, 0.0, 0.0);
    return out;
  }

  // Get entity data
  let entity = entities[in.instanceIndex];

  // Determine entity color based on species
  var color: vec4f;
  switch (entity.species % 3u) {
    case 0u: { // Producers (plants) - green
      color = vec4f(0.2, 0.8, 0.2, 1.0);
    }
    case 1u: { // Herbivores - blue
      color = vec4f(0.2, 0.2, 0.8, 1.0);
    }
    default: { // Carnivores/omnivores - red
      color = vec4f(0.8, 0.2, 0.2, 1.0);
    }
  }

  // Scale by entity size
  let radius = entity.size;
  let scaled_pos = in.position * radius;

  // Transform vertex position using math utilities
  let rotated_pos = rotate2D(scaled_pos, dirToAngle(entity.velocity) * 0.5);
  let world_pos = vec4f(entity.position.x + rotated_pos.x, entity.position.y + rotated_pos.y, 0.0, 1.0);
  out.position = viewport.projMatrix * viewport.viewMatrix * world_pos;

  // Pass color, energy and UV coordinates to fragment shader
  out.color = color;
  out.energy = entity.energy;
  out.uv = in.position; // Unit circle position is also our UV

  return out;
}

// Fragment shader
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  // Calculate distance from center for circle rendering
  let dist = length(in.uv);

  // Create a smooth circle using our math utilities
  let circle = 1.0 - smoothstepf(0.8, 1.0, dist);

  // Energy factor affects brightness
  let energy_factor = clampf(in.energy / 100.0, 0.2, 1.0);

  // Apply energy to brightness
  let final_color = in.color * energy_factor;

  // Alpha based on circle edge
  let alpha = circle;

  // Return final color with alpha
  return vec4f(final_color.rgb, alpha * final_color.a);
}