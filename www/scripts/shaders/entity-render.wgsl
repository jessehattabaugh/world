// Entity Rendering Vertex/Fragment Shader
// This shader handles rendering entities in the ecosystem

// Include common type definitions
#include "common/entity-types.wgsl"
#include "common/math.wgsl"

// Vertex shader inputs/outputs
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
    @location(1) uv: vec2f
}

// Uniform data for rendering
struct RenderParams {
    viewProj: mat4x4f,
    screenSize: vec2f,
    time: f32,
    padding: f32
}

@group(0) @binding(0) var<storage, read> entities: array<Entity>;
@group(0) @binding(1) var<uniform> params: RenderParams;

// Vertex attributes for instanced quad rendering
const QUAD_POSITIONS = array<vec2f, 4>(
    vec2f(-1.0, -1.0),
    vec2f( 1.0, -1.0),
    vec2f(-1.0,  1.0),
    vec2f( 1.0,  1.0)
);

const QUAD_UVS = array<vec2f, 4>(
    vec2f(0.0, 0.0),
    vec2f(1.0, 0.0),
    vec2f(0.0, 1.0),
    vec2f(1.0, 1.0)
);

// Get color based on entity type with smooth transitions
fn getEntityColor(species: u32, energy: f32) -> vec4f {
    // Base colors for each species
    let plantColor = vec4f(0.2, 0.8, 0.3, 1.0);     // Green
    let herbivoreColor = vec4f(0.2, 0.5, 0.8, 1.0); // Blue
    let predatorColor = vec4f(0.8, 0.3, 0.2, 1.0);  // Red

    // Energy factor affects brightness
    let energyFactor = clamp(energy / 100.0, 0.3, 1.0);

    var color: vec4f;
    switch species {
        case 0u: { // Plant
            color = plantColor;
        }
        case 1u: { // Herbivore
            color = herbivoreColor;
        }
        default: { // Predator
            color = predatorColor;
        }
    }

    // Apply energy-based brightness
    color = vec4f(color.rgb * energyFactor, color.a);

    return color;
}

// Vertex shader using instancing for efficiency
@vertex
fn vertexMain(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
    var output: VertexOutput;
    let entity = entities[instanceIndex];

    // Calculate size based on entity properties
    let size = entity.size * 5.0;

    // Get quad vertex position
    let quadPos = QUAD_POSITIONS[vertexIndex];

    // Apply rotation based on velocity direction
    let angle = atan2(entity.velocity.y, entity.velocity.x);
    let rotatedPos = rotate2D(quadPos * size, angle);

    // Transform to screen space
    let worldPos = vec4f(
        entity.position.x + rotatedPos.x,
        entity.position.y + rotatedPos.y,
        0.0,
        1.0
    );
    output.position = params.viewProj * worldPos;

    // Pass color and UVs to fragment shader
    output.color = getEntityColor(entity.species, entity.energy);
    output.uv = QUAD_UVS[vertexIndex];

    return output;
}

// Fragment shader with smooth entity rendering
@fragment
fn fragmentMain(
    @location(0) color: vec4f,
    @location(1) uv: vec2f
) -> @location(0) vec4f {
    // Calculate radial distance from center
    let dist = length(uv * 2.0 - 1.0);

    // Smooth circle shape with anti-aliasing
    let circle = 1.0 - smoothstep(0.8, 1.0, dist);

    // Apply smooth circle mask to color
    return vec4f(color.rgb, color.a * circle);
}