/**
 * Tile Worker - Handles processing for individual tiles in the WebGPU ecosystem simulation
 *
 * This worker is responsible for:
 * 1. Managing entities (lifeforms, resources) within its assigned tiles
 * 2. Computing entity behavior and interactions using WebGPU
 * 3. Rendering its tile's contents to an OffscreenCanvas
 * 4. Communicating with the main thread and neighboring tiles
 *
 * Each worker may be assigned multiple tiles for efficiency
 */

// Keep track of assigned tiles
/** @type {Map<string, Object>} */
const assignedTiles = new Map();

// Worker state
let workerId = -1;
let isRunning = false;
let lastFrameTime = 0;
let frameCount = 0;

// WebGPU resources
let adapter = null;
let device = null;
let computePipeline = null;
let renderPipeline = null;
let simulationShaderModule = null;
let renderShaderModule = null;

// Feature support
const features = {
  webGPU: false,
  offscreenCanvas: false
};

/**
 * Initialize WebGPU for this worker
 */
async function initWebGPU() {
  try {
    // Request adapter
    adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance'
    });

    if (!adapter) {
      throw new Error('Failed to get WebGPU adapter in worker');
    }

    // Request device
    device = await adapter.requestDevice();

    // Initialize compute shader for simulation
    simulationShaderModule = device.createShaderModule({
      label: 'Entity simulation shader',
      code: `
        struct Entity {
          position: vec2f,  // x, y position
          velocity: vec2f,  // velocity vector
          energy: f32,      // current energy level
          species: u32,     // species identifier
          size: f32,        // entity size
          padding: f32      // padding for alignment
        }

        @group(0) @binding(0) var<storage, read> input_entities: array<Entity>;
        @group(0) @binding(1) var<storage, read_write> output_entities: array<Entity>;

        struct SimParams {
          deltaTime: f32,
          frameCount: u32,
          tileWidth: u32,
          tileHeight: u32
        }

        @group(0) @binding(2) var<uniform> params: SimParams;

        // Simple random number generator for WGSL
        // This uses a basic linear congruential generator
        fn rand(seed: u32) -> f32 {
          let a = 1664525u;
          let c = 1013904223u;
          let m = 4294967296u; // 2^32

          // Use frameCount and other values to create varied seed
          let new_seed = (a * seed + c) % m;
          return f32(new_seed) / f32(m);
        }

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let idx = global_id.x;

          // Make sure we don't go out of bounds
          if (idx >= arrayLength(&input_entities)) {
            return;
          }

          // Copy the entity from input to output
          var entity = input_entities[idx];

          // Apply simple physics and behavior
          let random_seed = params.frameCount * 1000u + idx;
          let random_value = rand(random_seed);

          // Add some random movement
          let random_angle = random_value * 6.28318; // 2*PI
          let random_force = 0.1 * random_value;

          entity.velocity.x += cos(random_angle) * random_force;
          entity.velocity.y += sin(random_angle) * random_force;

          // Apply velocity
          entity.position.x += entity.velocity.x * params.deltaTime;
          entity.position.y += entity.velocity.y * params.deltaTime;

          // Constrain to tile bounds (bounce off edges)
          if (entity.position.x < 0.0) {
            entity.position.x = 0.0;
            entity.velocity.x = -entity.velocity.x * 0.8;
          }
          if (entity.position.x > f32(params.tileWidth)) {
            entity.position.x = f32(params.tileWidth);
            entity.velocity.x = -entity.velocity.x * 0.8;
          }

          if (entity.position.y < 0.0) {
            entity.position.y = 0.0;
            entity.velocity.y = -entity.velocity.y * 0.8;
          }
          if (entity.position.y > f32(params.tileHeight)) {
            entity.position.y = f32(params.tileHeight);
            entity.velocity.y = -entity.velocity.y * 0.8;
          }

          // Slow down over time (friction/drag)
          entity.velocity.x *= 0.98;
          entity.velocity.y *= 0.98;

          // Gradually consume energy
          entity.energy -= 0.05 * params.deltaTime;

          // Store the updated entity
          output_entities[idx] = entity;
        }
      `
    });

    // Create the compute pipeline
    computePipeline = await device.createComputePipelineAsync({
      label: 'Entity simulation pipeline',
      layout: 'auto',
      compute: {
        module: simulationShaderModule,
        entryPoint: 'main'
      }
    });

    // If we reach here, WebGPU is initialized
    features.webGPU = true;

    postMessage({
      type: 'workerStatus',
      status: 'gpu-ready',
      workerId
    });

    return true;
  } catch (error) {
    console.error('WebGPU initialization failed in worker:', error);
    postMessage({
      type: 'workerStatus',
      status: 'gpu-failed',
      workerId,
      error: error.message
    });
    return false;
  }
}

/**
 * Initialize a tile with the provided information
 * @param {string} tileId - The unique ID of this tile
 * @param {Object} tileInfo - Information about the tile
 * @param {OffscreenCanvas} [canvas] - The OffscreenCanvas for this tile (if supported)
 */
function initializeTile(tileId, tileInfo, canvas) {
  // Create a new tile object
  const tile = {
    id: tileId,
    info: tileInfo,
    canvas: canvas,
    context: null,
    entities: [],
    lastUpdate: 0,
    ready: false,
    // WebGPU resources for this tile
    buffers: {
      input: null,
      output: null,
      params: null
    },
    bindGroups: {
      simulation: null
    }
  };

  // If we have a canvas, set up the context
  if (canvas) {
    // Try to get a WebGPU context if supported
    if (features.webGPU) {
      try {
        // For WebGPU on OffscreenCanvas
        tile.context = canvas.getContext('webgpu');
        const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

        tile.context.configure({
          device,
          format: canvasFormat,
          alphaMode: 'premultiplied'
        });

        // TODO: Initialize render pipeline for this tile

        features.offscreenCanvas = true;
      } catch (error) {
        console.warn('WebGPU context on OffscreenCanvas failed, falling back to 2D:', error);
        // Fall back to 2D context
        tile.context = canvas.getContext('2d');
      }
    } else {
      // Use 2D context as fallback
      tile.context = canvas.getContext('2d');
    }
  }

  // Store the tile in our map
  assignedTiles.set(tileId, tile);

  // Mark the tile as ready
  tile.ready = true;

  // Notify the main thread
  postMessage({
    type: 'tileReady',
    tileId,
    workerId
  });
}

/**
 * Create GPU buffers for a tile's entities
 * @param {Object} tile - The tile object
 * @param {number} maxEntities - Maximum number of entities to allocate space for
 */
function createTileBuffers(tile, maxEntities = 100) {
  if (!device || !features.webGPU) return;

  // Entity size in bytes (2 vec2f + 2 f32 + 1 u32 + padding)
  const ENTITY_SIZE = 4 * 4 + 4 * 2 + 4 + 4; // 32 bytes

  // Create input buffer for entities
  tile.buffers.input = device.createBuffer({
    label: `${tile.id}-input-buffer`,
    size: maxEntities * ENTITY_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });

  // Create output buffer for entities
  tile.buffers.output = device.createBuffer({
    label: `${tile.id}-output-buffer`,
    size: maxEntities * ENTITY_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });

  // Create params uniform buffer
  tile.buffers.params = device.createBuffer({
    label: `${tile.id}-params-buffer`,
    size: 16, // deltaTime (f32) + frameCount (u32) + tileWidth (u32) + tileHeight (u32)
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  // Create staging buffer for reading results
  tile.buffers.staging = device.createBuffer({
    label: `${tile.id}-staging-buffer`,
    size: maxEntities * ENTITY_SIZE,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
  });

  // Create bind group for the simulation
  tile.bindGroups.simulation = device.createBindGroup({
    label: `${tile.id}-simulation-bindgroup`,
    layout: computePipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: { buffer: tile.buffers.input }
      },
      {
        binding: 1,
        resource: { buffer: tile.buffers.output }
      },
      {
        binding: 2,
        resource: { buffer: tile.buffers.params }
      }
    ]
  });
}

/**
 * Spawn a new entity in the specified tile
 * @param {string} tileId - ID of the tile
 * @param {Object} entityData - Entity data
 */
function spawnEntity(tileId, entityData) {
  const tile = assignedTiles.get(tileId);
  if (!tile) return;

  // Add the entity to the tile
  tile.entities.push({
    ...entityData,
    id: `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now()
  });

  // If we have more entities than our buffers can handle, recreate the buffers
  if (features.webGPU && tile.buffers && tile.entities.length > 100) {
    createTileBuffers(tile, Math.ceil(tile.entities.length * 1.5));
  }

  // Notify the main thread
  postMessage({
    type: 'tileUpdate',
    tileId,
    entities: tile.entities,
    workerId
  });
}

/**
 * Update a tile's simulation with the current entities
 * @param {string} tileId - ID of the tile to update
 * @param {number} deltaTime - Time since last update
 */
function updateTileSimulation(tileId, deltaTime) {
  const tile = assignedTiles.get(tileId);
  if (!tile || !tile.ready) return;

  // Update timestamp
  tile.lastUpdate = Date.now();

  // If we have WebGPU, use the compute shader
  if (features.webGPU && device && tile.buffers && tile.entities.length > 0) {
    // Only update if we have entities
    if (tile.entities.length === 0) return;

    // Update params buffer with current deltaTime and frameCount
    const paramsData = new ArrayBuffer(16);
    const paramsView = new DataView(paramsData);
    paramsView.setFloat32(0, deltaTime, true); // deltaTime
    paramsView.setUint32(4, frameCount, true); // frameCount
    paramsView.setUint32(8, tile.info.width, true); // tileWidth
    paramsView.setUint32(12, tile.info.height, true); // tileHeight

    device.queue.writeBuffer(tile.buffers.params, 0, paramsData);

    // Convert entities to buffer data
    const entityData = new ArrayBuffer(32 * tile.entities.length);
    const dataView = new DataView(entityData);

    // Pack entities into the buffer
    for (let i = 0; i < tile.entities.length; i++) {
      const entity = tile.entities[i];
      const offset = i * 32; // Each entity is 32 bytes

      // position (vec2f)
      dataView.setFloat32(offset + 0, entity.x, true);
      dataView.setFloat32(offset + 4, entity.y, true);

      // velocity (vec2f) - use defaults if not specified
      dataView.setFloat32(offset + 8, entity.vx || 0, true);
      dataView.setFloat32(offset + 12, entity.vy || 0, true);

      // energy (f32)
      dataView.setFloat32(offset + 16, entity.energy || 100, true);

      // species (u32)
      dataView.setUint32(offset + 20, entity.species || 0, true);

      // size (f32)
      dataView.setFloat32(offset + 24, entity.size || 5, true);

      // padding (f32)
      dataView.setFloat32(offset + 28, 0, true);
    }

    // Upload entity data to the GPU
    device.queue.writeBuffer(tile.buffers.input, 0, entityData);

    // Create a command encoder
    const encoder = device.createCommandEncoder({
      label: `${tileId}-update-encoder`
    });

    // Begin a compute pass
    const computePass = encoder.beginComputePass({
      label: `${tileId}-update-pass`
    });

    // Set the pipeline and bind groups
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, tile.bindGroups.simulation);

    // Dispatch the compute work - one workgroup per 64 entities
    const workgroupCount = Math.ceil(tile.entities.length / 64);
    computePass.dispatchWorkgroups(workgroupCount);

    // End the compute pass
    computePass.end();

    // Copy the output buffer to the staging buffer for reading
    encoder.copyBufferToBuffer(
      tile.buffers.output, 0,
      tile.buffers.staging, 0,
      tile.entities.length * 32
    );

    // Submit the commands
    device.queue.submit([encoder.finish()]);

    // Read back the results
    readTileResults(tile);
  } else {
    // Fallback: Update entities using JavaScript (CPU-based)
    updateEntitiesCPU(tile, deltaTime);
  }

  // Draw the tile (either using WebGPU or 2D context)
  drawTile(tile);

  // Send updated entities to main thread
  postMessage({
    type: 'tileUpdate',
    tileId,
    entities: tile.entities,
    workerId
  });
}

/**
 * Read back entity data from the GPU after simulation
 * @param {Object} tile - The tile object
 */
async function readTileResults(tile) {
  // Map the staging buffer to read the results
  await tile.buffers.staging.mapAsync(GPUMapMode.READ);

  // Get the mapped buffer range
  const data = new Float32Array(tile.buffers.staging.getMappedRange());

  // Copy the results back to the entity objects
  for (let i = 0; i < tile.entities.length; i++) {
    const entity = tile.entities[i];
    const offset = i * 8; // Each entity uses 8 float32 values (32 bytes)

    // Update entity properties
    entity.x = data[offset + 0];
    entity.y = data[offset + 1];
    entity.vx = data[offset + 2];
    entity.vy = data[offset + 3];
    entity.energy = data[offset + 4];
    entity.species = data[offset + 5]; // Actually a uint, but we treat it as a float
    entity.size = data[offset + 6];
    // data[offset + 7] is padding
  }

  // Unmap the buffer
  tile.buffers.staging.unmap();
}

/**
 * Fallback CPU-based entity update logic
 * @param {Object} tile - The tile object
 * @param {number} deltaTime - Time since last update
 */
function updateEntitiesCPU(tile, deltaTime) {
  // Skip if the tile has no entities
  if (!tile.entities.length) return;

  // Update each entity
  tile.entities.forEach(entity => {
    // Create velocity properties if they don't exist
    if (entity.vx === undefined) entity.vx = 0;
    if (entity.vy === undefined) entity.vy = 0;

    // Add some random movement
    const randomAngle = Math.random() * Math.PI * 2;
    const randomForce = Math.random() * 0.1;

    entity.vx += Math.cos(randomAngle) * randomForce;
    entity.vy += Math.sin(randomAngle) * randomForce;

    // Apply velocity
    entity.x += entity.vx * deltaTime;
    entity.y += entity.vy * deltaTime;

    // Bounce off edges
    if (entity.x < 0) {
      entity.x = 0;
      entity.vx = -entity.vx * 0.8;
    }
    if (entity.x > tile.info.width) {
      entity.x = tile.info.width;
      entity.vx = -entity.vx * 0.8;
    }

    if (entity.y < 0) {
      entity.y = 0;
      entity.vy = -entity.vy * 0.8;
    }
    if (entity.y > tile.info.height) {
      entity.y = tile.info.height;
      entity.vy = -entity.vy * 0.8;
    }

    // Slow down over time (friction/drag)
    entity.vx *= 0.98;
    entity.vy *= 0.98;

    // Gradually consume energy
    entity.energy -= 0.05 * deltaTime;
  });

  // Remove dead entities
  tile.entities = tile.entities.filter(entity => entity.energy > 0);
}

/**
 * Draw a tile's contents to its canvas
 * @param {Object} tile - The tile object
 */
function drawTile(tile) {
  // Skip if there's no canvas or context
  if (!tile.canvas || !tile.context) return;

  // If we have a WebGPU context, use WebGPU rendering
  if (tile.context.constructor.name === 'GPUCanvasContext') {
    // TODO: Add WebGPU rendering
    // This is a placeholder for now
  } else {
    // Use 2D Canvas rendering
    const ctx = tile.context;

    // Clear the canvas
    ctx.fillStyle = '#0a1e12';
    ctx.fillRect(0, 0, tile.info.width, tile.info.height);

    // Draw a border to visualize the tile (for debugging)
    ctx.strokeStyle = 'rgba(127, 224, 132, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, tile.info.width, tile.info.height);

    // Draw the entities
    tile.entities.forEach(entity => {
      if (entity.type === 'lifeform') {
        // Different colors per species
        const speciesColors = [
          '#7fe084', // Green
          '#e07f7f', // Red
          '#7f7fe0', // Blue
          '#e0e07f', // Yellow
          '#e07fe0'  // Purple
        ];

        const color = speciesColors[entity.species % speciesColors.length];

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(entity.x, entity.y, entity.size || 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw energy bar above entity
        const energyPercent = (entity.energy / 100);
        const barWidth = entity.size * 2;
        const barHeight = 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(
          entity.x - barWidth / 2,
          entity.y - entity.size - barHeight - 2,
          barWidth,
          barHeight
        );

        ctx.fillStyle = energyPercent > 0.5 ? '#7fe084' : '#e07f7f';
        ctx.fillRect(
          entity.x - barWidth / 2,
          entity.y - entity.size - barHeight - 2,
          barWidth * energyPercent,
          barHeight
        );
      }
    });

    // Draw tile ID for debugging
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px monospace';
    ctx.fillText(tile.id, 5, 12);
    ctx.fillText(`Entities: ${tile.entities.length}`, 5, 24);
  }
}

/**
 * Reset all tiles assigned to this worker
 */
function resetAllTiles() {
  for (const [tileId, tile] of assignedTiles.entries()) {
    // Clear entities
    tile.entities = [];

    // Redraw the tile
    drawTile(tile);

    // Notify main thread
    postMessage({
      type: 'tileUpdate',
      tileId,
      entities: [],
      workerId
    });
  }
}

/**
 * Main update loop for the worker
 */
function updateLoop() {
  // Skip if not running
  if (!isRunning) return;

  // Calculate delta time
  const now = performance.now();
  const deltaTime = (now - lastFrameTime) / 1000; // Convert to seconds
  lastFrameTime = now;

  // Increment frame counter
  frameCount++;

  // Update each tile
  for (const [tileId, tile] of assignedTiles.entries()) {
    if (tile.ready) {
      updateTileSimulation(tileId, deltaTime);
    }
  }

  // Send status update occasionally
  if (frameCount % 60 === 0) {
    postMessage({
      type: 'workerStatus',
      status: 'running',
      workerId,
      frameCount,
      tileCount: assignedTiles.size,
      entityCount: Array.from(assignedTiles.values())
        .reduce((sum, tile) => sum + tile.entities.length, 0)
    });
  }

  // Schedule next update
  setTimeout(updateLoop, 16); // ~60fps
}

// Set up message handler
self.onmessage = async function(event) {
  const { type, ...data } = event.data;

  switch (type) {
    case 'init':
      // Initialize the worker
      workerId = data.workerId;

      // Store feature support flags
      if (data.features) {
        Object.assign(features, data.features);
      }

      // Initialize WebGPU if supported
      if (features.webGPU) {
        await initWebGPU();
      }

      postMessage({
        type: 'workerStatus',
        status: 'initialized',
        workerId,
        features
      });
      break;

    case 'assignTile':
      // Initialize a new tile
      initializeTile(data.tileId, data.tileInfo, data.canvas);

      // If we have WebGPU, create buffers for this tile
      if (features.webGPU && device) {
        const tile = assignedTiles.get(data.tileId);
        if (tile) {
          createTileBuffers(tile);
        }
      }
      break;

    case 'spawnEntity':
      // Spawn a new entity in the specified tile
      spawnEntity(data.tileId, data.entity);
      break;

    case 'control':
      // Handle control commands
      switch (data.action) {
        case 'start':
          if (!isRunning) {
            isRunning = true;
            lastFrameTime = performance.now();
            updateLoop();
            postMessage({
              type: 'workerStatus',
              status: 'started',
              workerId
            });
          }
          break;

        case 'stop':
          isRunning = false;
          postMessage({
            type: 'workerStatus',
            status: 'stopped',
            workerId
          });
          break;

        case 'reset':
          resetAllTiles();
          frameCount = 0;
          postMessage({
            type: 'workerStatus',
            status: 'reset',
            workerId
          });
          break;
      }
      break;

    case 'updateTile':
      // Manual update of a single tile
      if (data.tileId && assignedTiles.has(data.tileId)) {
        updateTileSimulation(data.tileId, 1/60);
      }
      break;

    default:
      console.warn(`Unknown message type: ${type}`);
  }
};

// Log that the worker has started
console.debug('🌱 Tile worker initialized');

// Send ready message
postMessage({
  type: 'workerStatus',
  status: 'ready'
});