/**
 * WebGPU Device and Buffer Management
 */
export class WebGPUManager {
    constructor() {
        this.device = null;
        this.adapter = null;
        this.initialized = false;
        this.entityBuffer = null;
        this.neuronBuffer = null;
        this.configBuffer = null;
    }

    /**
     * Initialize WebGPU device and adapter
     */
    async initialize() {
        if (!navigator.gpu) {
            throw new Error('WebGPU not supported');
        }

        this.adapter = await navigator.gpu.requestAdapter();
        if (!this.adapter) {
            throw new Error('No WebGPU adapter found');
        }

        this.device = await this.adapter.requestDevice();
        this.initialized = true;
        return true;
    }

    /**
     * Create and initialize buffers
     */
    createBuffers(entityCapacity) {
        // Entity buffer: 32 bytes per entity (8 floats)
        this.entityBuffer = this.device.createBuffer({
            size: entityCapacity * 32,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });

        // Neural network output buffer: 4 floats per entity
        this.neuronBuffer = this.device.createBuffer({
            size: entityCapacity * 16,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        // Configuration buffer
        this.configBuffer = this.device.createBuffer({
            size: 16, // float deltaTime, width, height, uint32 entityCount
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }

    /**
     * Update entity data in GPU buffer
     */
    updateEntityBuffer(entities) {
        const entityArray = new Float32Array(entities.length * 8);
        let offset = 0;

        for (const entity of entities) {
            entityArray[offset++] = entity.position.x;
            entityArray[offset++] = entity.position.y;
            entityArray[offset++] = entity.velocity.x;
            entityArray[offset++] = entity.velocity.y;
            entityArray[offset++] = entity.energy;
            entityArray[offset++] = entity.species;
            entityArray[offset++] = entity.genes.speed;
            entityArray[offset++] = entity.genes.senseRange;
        }

        this.device.queue.writeBuffer(this.entityBuffer, 0, entityArray);
    }

    /**
     * Update neural network outputs in GPU buffer
     */
    updateNeuronBuffer(outputs) {
        const neuronArray = new Float32Array(outputs);
        this.device.queue.writeBuffer(this.neuronBuffer, 0, neuronArray);
    }

    /**
     * Update simulation configuration in GPU buffer
     */
    updateConfig(deltaTime, width, height, entityCount) {
        const configArray = new Float32Array([
            deltaTime,
            width,
            height,
            entityCount
        ]);
        this.device.queue.writeBuffer(this.configBuffer, 0, configArray);
    }

    /**
     * Read back entity data from GPU
     */
    async readEntityBuffer(entityCount) {
        const stagingBuffer = this.device.createBuffer({
            size: entityCount * 32,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });

        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            this.entityBuffer,
            0,
            stagingBuffer,
            0,
            entityCount * 32
        );

        this.device.queue.submit([commandEncoder.finish()]);
        await stagingBuffer.mapAsync(GPUMapMode.READ);

        const entityData = new Float32Array(stagingBuffer.getMappedRange());
        const entities = [];

        for (let i = 0; i < entityCount; i++) {
            const baseIndex = i * 8;
            entities.push({
                position: {
                    x: entityData[baseIndex],
                    y: entityData[baseIndex + 1]
                },
                velocity: {
                    x: entityData[baseIndex + 2],
                    y: entityData[baseIndex + 3]
                },
                energy: entityData[baseIndex + 4],
                species: entityData[baseIndex + 5],
                genes: {
                    speed: entityData[baseIndex + 6],
                    senseRange: entityData[baseIndex + 7]
                }
            });
        }

        stagingBuffer.unmap();
        return entities;
    }

    /**
     * Check if WebGPU is available and initialized
     */
    isReady() {
        return this.initialized && this.device && this.adapter;
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.entityBuffer?.destroy();
        this.neuronBuffer?.destroy();
        this.configBuffer?.destroy();
        this.device?.destroy();
    }
}