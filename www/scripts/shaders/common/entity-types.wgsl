// Common Entity Data Structures for WGSL Shaders
// This file defines the standard structures and constants for entities in the ecosystem

// Default entity constants
#ifndef MAX_ENTITIES
#define MAX_ENTITIES 1000
#endif

#ifndef WORKGROUP_SIZE
#define WORKGROUP_SIZE 64
#endif

// Entity structure - must match the JavaScript structure
struct Entity {
  position: vec2f,  // x, y position
  velocity: vec2f,  // velocity vector
  energy: f32,      // current energy level
  species: u32,     // species identifier
  size: f32,        // entity size
  padding: f32      // padding for alignment (32 bytes total)
}

// Simulation parameters
struct SimParams {
  deltaTime: f32,   // Time since last frame
  frameCount: u32,  // Current frame number
  worldWidth: f32,  // Width of the simulation world
  worldHeight: f32, // Height of the simulation world

  // Species parameters
  plantGrowthRate: f32,
  herbivoreSpeed: f32,
  carnivoreSpeed: f32,

  // Additional flags and settings
  enableMutation: u32,
  enableReproduction: u32,
  randomSeed: u32
}