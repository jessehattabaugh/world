/**
 * WebGPU Compute Pipeline for Entity Processing
 */
export class ComputePipeline {
    constructor(device) {
        this.device = device;
        this.initialized = false;
        this.shaderModule = null;
        this.bindGroupLayout = null;
        this.pipeline = {
            update: null,
            physics: null
        };
    }

    /**
     * Initialize compute pipeline
     */
    async initialize() {
        // Create shader module
        this.shaderModule = this.device.createShaderModule({
            code: `
            struct Entity {
                position: vec2f,
                velocity: vec2f,
                energy: f32,
                species: f32,
                genes: vec4f
            };

            @group(0) @binding(0) var<storage, read_write> entities: array<Entity>;
            @group(0) @binding(1) var<storage, read> neurons: array<f32>;
            @group(0) @binding(2) var<uniform> config: Config;

            struct Config {
                deltaTime: f32,
                width: f32,
                height: f32,
                entityCount: u32
            };

            // Neural network compute shader
            @compute @workgroup_size(64)
            fn updateEntities(@builtin(global_invocation_id) global_id: vec3u) {
                let index = global_id.x;
                if (index >= config.entityCount) {
                    return;
                }

                var entity = entities[index];

                // Skip food (species 0)
                if (entity.species <= 0.5) {
                    return;
                }

                // Get neural network outputs from buffer
                let baseOffset = index * 4;
                let moveDir = neurons[baseOffset];
                let moveSpeed = neurons[baseOffset + 1];
                let eatProbability = neurons[baseOffset + 2];
                let reproduceProbability = neurons[baseOffset + 3];

                // Update velocity based on neural outputs
                let angle = moveDir * 6.28318530718; // 2*PI
                let speed = moveSpeed * entity.genes[0]; // genes[0] = speed gene
                entity.velocity = vec2f(
                    cos(angle) * speed,
                    sin(angle) * speed
                );

                // Update position
                entity.position += entity.velocity * config.deltaTime;

                // Constrain to bounds
                entity.position = clamp(
                    entity.position,
                    vec2f(0.0, 0.0),
                    vec2f(config.width, config.height)
                );

                // Update energy
                let movementCost = length(entity.velocity) * entity.genes[2]; // genes[2] = metabolism
                entity.energy -= movementCost * config.deltaTime;

                // Store updated entity
                entities[index] = entity;
            }

            // Physics and interaction compute shader
            @compute @workgroup_size(64)
            fn updatePhysics(@builtin(global_invocation_id) global_id: vec3u) {
                let index = global_id.x;
                if (index >= config.entityCount) {
                    return;
                }

                var entity = entities[index];

                // Skip dead entities
                if (entity.energy <= 0.0) {
                    return;
                }

                // Interaction radius based on sense range gene
                let radius = entity.genes[1]; // genes[1] = senseRange
                let radiusSq = radius * radius;

                // Check interactions with other entities
                for (var i = 0u; i < config.entityCount; i++) {
                    if (i == index) {
                        continue;
                    }

                    let other = entities[i];
                    let delta = other.position - entity.position;
                    let distSq = dot(delta, delta);

                    // Skip if too far
                    if (distSq > radiusSq) {
                        continue;
                    }

                    // Food consumption (species 0 = food)
                    if (other.species <= 0.5 && entity.species > 0.5 && entity.species < 1.5) {
                        if (distSq < 25.0) { // Close enough to eat
                            entity.energy += other.energy;
                            other.energy = 0.0;
                            entities[i] = other;
                        }
                    }

                    // Predation (species 2 = predator, species 1 = prey)
                    if (entity.species > 1.5 && other.species > 0.5 && other.species < 1.5) {
                        if (distSq < 100.0) { // Close enough to attack
                            let attack = entity.genes[3]; // genes[3] = strength
                            let defense = other.genes[3];

                            if (attack > defense) {
                                entity.energy += min(other.energy, 50.0);
                                other.energy = 0.0;
                                entities[i] = other;
                            }
                        }
                    }
                }

                // Store updated entity
                entities[index] = entity;
            }
            `
        });

        // Create bind group layout
        this.bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage"
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage"
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "uniform"
                    }
                }
            ]
        });

        // Create pipeline layout
        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.bindGroupLayout]
        });

        // Create compute pipelines
        this.pipeline.update = this.device.createComputePipeline({
            layout: pipelineLayout,
            compute: {
                module: this.shaderModule,
                entryPoint: "updateEntities"
            }
        });

        this.pipeline.physics = this.device.createComputePipeline({
            layout: pipelineLayout,
            compute: {
                module: this.shaderModule,
                entryPoint: "updatePhysics"
            }
        });

        this.initialized = true;
        return true;
    }

    /**
     * Create buffer bind group for compute operations
     */
    createBindGroup(entityBuffer, neuronBuffer, configBuffer) {
        return this.device.createBindGroup({
            layout: this.bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: entityBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: neuronBuffer
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: configBuffer
                    }
                }
            ]
        });
    }

    /**
     * Dispatch compute operations
     */
    dispatch(commandEncoder, pipeline, bindGroup, entityCount) {
        const workgroupsX = Math.ceil(entityCount / 64);

        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.dispatchWorkgroups(workgroupsX);
        passEncoder.end();
    }
}