/**
 * WebGPU Initialization and Compute Example
 *
 * This script demonstrates initialization of WebGPU, setting up compute pipelines,
 * and transferring data between CPU and GPU using TypeScript-style JSDoc annotations.
 *
 * @module WebGPUSetup
 * @requires @webgpu/types
 */

/**
 * Initializes WebGPU and runs a simple compute shader that multiplies each array element by 2
 * @param {HTMLElement} statusContainer - Container element for displaying status messages
 * @returns {Promise<void>}
 */
async function initWebGPU(statusContainer) {
  // Keep track of initialization stages for better error reporting
  let currentStage = 'checking-support';

  try {
    // ============================
    // 1. Check for WebGPU support
    // ============================
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported! Your browser doesn\'t support WebGPU.');
    }

    logStatus(statusContainer, 'WebGPU is supported! ✅');
    console.debug('🌱 WebGPU is supported');
    currentStage = 'requesting-adapter';

    // ============================
    // 2. Request GPU adapter
    // ============================
    /** @type {GPUAdapter} */
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance'
    });

    if (!adapter) {
      throw new Error('Couldn\'t request WebGPU adapter! Your device might not support WebGPU.');
    }

    logStatus(statusContainer, 'GPU adapter acquired! ✅');
    console.debug('🌱 GPU adapter acquired:', await adapter.requestAdapterInfo());
    currentStage = 'requesting-device';

    // ============================
    // 3. Request GPU device
    // ============================
    /** @type {GPUDevice} */
    const device = await adapter.requestDevice({
      requiredFeatures: [],
      requiredLimits: {
        maxBufferSize: 1024 * 1024, // 1MB buffer size
      }
    });

    logStatus(statusContainer, 'GPU device ready! ✅');
    console.debug('🌱 GPU device acquired');
    currentStage = 'creating-shader';

    // ============================
    // 4. Create compute shader
    // ============================
    // WGSL shader that multiplies each element by 2
    const shaderModule = device.createShaderModule({
      label: 'Double values compute shader',
      code: `
        // Input buffer containing values to multiply
        @group(0) @binding(0) var<storage, read> inputBuffer: array<f32>;

        // Output buffer to store results
        @group(0) @binding(1) var<storage, read_write> outputBuffer: array<f32>;

        // Compute shader entry point - workgroup size of 64 threads
        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          // Get the current index from thread ID
          let index = global_id.x;

          // Make sure we don't go out of bounds
          if (index >= arrayLength(&inputBuffer)) {
            return;
          }

          // Multiply each input value by 2
          outputBuffer[index] = inputBuffer[index] * 2.0;
        }
      `
    });

    logStatus(statusContainer, 'Compute shader compiled! ✅');
    console.debug('🌱 Compute shader compiled');
    currentStage = 'creating-pipeline';

    // ============================
    // 5. Create compute pipeline
    // ============================
    /** @type {GPUComputePipeline} */
    const computePipeline = await device.createComputePipelineAsync({
      label: 'Double values pipeline',
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'main'
      }
    });

    logStatus(statusContainer, 'Compute pipeline created! ✅');
    console.debug('🌱 Compute pipeline created');
    currentStage = 'preparing-data';

    // ============================
    // 6. Prepare input data
    // ============================
    // Sample input data: array of 1000 floats from 0 to 999
    const inputData = new Float32Array(1000);
    for (let i = 0; i < inputData.length; i++) {
      inputData[i] = i;
    }

    // Create a buffer to hold input values
    /** @type {GPUBuffer} */
    const inputBuffer = device.createBuffer({
      label: 'Input buffer',
      size: inputData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Create a buffer to hold output values
    /** @type {GPUBuffer} */
    const outputBuffer = device.createBuffer({
      label: 'Output buffer',
      size: inputData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    // Create a buffer for reading back the results to CPU
    /** @type {GPUBuffer} */
    const resultBuffer = device.createBuffer({
      label: 'Result buffer',
      size: inputData.byteLength,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // Copy input data to the GPU
    device.queue.writeBuffer(inputBuffer, 0, inputData);

    logStatus(statusContainer, 'Data prepared and uploaded to GPU! ✅');
    console.debug('🌱 Input data created and uploaded to GPU');
    currentStage = 'binding-groups';

    // ============================
    // 7. Create bind groups for the compute shader
    // ============================
    /** @type {GPUBindGroup} */
    const bindGroup = device.createBindGroup({
      label: 'Compute bind group',
      layout: computePipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: inputBuffer }
        },
        {
          binding: 1,
          resource: { buffer: outputBuffer }
        }
      ]
    });

    logStatus(statusContainer, 'Bind groups created! ✅');
    console.debug('🌱 Compute pipeline bind groups created');
    currentStage = 'encoding-commands';

    // ============================
    // 8. Create command encoder and dispatch compute work
    // ============================
    /** @type {GPUCommandEncoder} */
    const commandEncoder = device.createCommandEncoder({
      label: 'Compute command encoder'
    });

    // Begin a compute pass
    /** @type {GPUComputePassEncoder} */
    const computePass = commandEncoder.beginComputePass({
      label: 'Double values compute pass'
    });

    // Set pipeline and bind groups
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, bindGroup);

    // Dispatch workgroups to process all data items
    // We need to divide our data size by the workgroup size (64)
    // and round up to ensure we cover all elements
    const workgroupCount = Math.ceil(inputData.length / 64);
    computePass.dispatchWorkgroups(workgroupCount);

    // End the compute pass
    computePass.end();

    // Copy the output buffer to the result buffer for reading back to CPU
    commandEncoder.copyBufferToBuffer(
      outputBuffer, 0,
      resultBuffer, 0,
      resultBuffer.size
    );

    // Submit commands to the queue
    /** @type {GPUCommandBuffer} */
    const commandBuffer = commandEncoder.finish();
    device.queue.submit([commandBuffer]);

    logStatus(statusContainer, 'Compute work dispatched! ✅');
    console.debug('🌱 Compute work dispatched');
    currentStage = 'reading-results';

    // ============================
    // 9. Read back the results from GPU
    // ============================
    // Map the result buffer to read from it
    await resultBuffer.mapAsync(GPUMapMode.READ);

    // Get a mapped array of the results
    const resultData = new Float32Array(resultBuffer.getMappedRange());

    // Create a valid JavaScript array with the results
    // (we need to copy it before unmapping)
    const results = resultData.slice();

    // Unmap the buffer
    resultBuffer.unmap();

    logStatus(statusContainer, 'Results retrieved from GPU! ✅');
    console.debug('🌱 Results retrieved from GPU:', results);

    // ============================
    // 10. Validate the results
    // ============================
    let success = true;
    for (let i = 0; i < inputData.length; i++) {
      if (results[i] !== inputData[i] * 2) {
        console.error(`Validation error at index ${i}: expected ${inputData[i] * 2}, got ${results[i]}`);
        success = false;
        break;
      }
    }

    if (success) {
      logStatus(statusContainer, 'Computation successful: all values doubled correctly! ✅');
      console.debug('🌱 Compute validation complete: All values correctly doubled');

      // Display some sample results
      const sampleResults = [
        `Input[0] = ${inputData[0]} → Output[0] = ${results[0]}`,
        `Input[1] = ${inputData[1]} → Output[1] = ${results[1]}`,
        `Input[42] = ${inputData[42]} → Output[42] = ${results[42]}`,
        `Input[999] = ${inputData[999]} → Output[999] = ${results[999]}`
      ];

      logStatus(statusContainer, 'Sample results:', sampleResults.join('<br>'));
    } else {
      logStatus(statusContainer, 'Computation validation failed! Some results were incorrect. ❌');
      console.error('❌ Compute validation failed!');
    }

    // ============================
    // 11. Clean up (optional)
    // ============================
    // Add an event listener for when the page unloads
    window.addEventListener('beforeunload', () => {
      // Explicitly destroy the device to clean up resources
      device.destroy();
      console.debug('🌱 WebGPU resources cleaned up');
    });

    return {
      device,
      adapter,
      success,
      results
    };

  } catch (error) {
    // Detailed error handling with appropriate messages based on the stage
    console.error(`❌ WebGPU Error during ${currentStage}:`, error);

    // Provide user-friendly error messages
    let userMessage;
    switch (currentStage) {
      case 'checking-support':
        userMessage = 'Your browser does not support WebGPU. Please try Chrome 113+, Edge 113+ or other browsers with WebGPU enabled.';
        break;
      case 'requesting-adapter':
        userMessage = 'Failed to request a GPU adapter. Your device might not have compatible graphics hardware.';
        break;
      case 'requesting-device':
        userMessage = 'Failed to request a GPU device. The browser might have restricted WebGPU access.';
        break;
      case 'creating-shader':
        userMessage = 'Failed to compile the shader. This is likely a code issue rather than your device.';
        break;
      default:
        userMessage = `An error occurred during WebGPU initialization: ${error.message}`;
    }

    logStatus(statusContainer, `Error: ${userMessage} ❌`, true);

    // Rethrow to allow caller to handle the error
    throw error;
  }
}

/**
 * Helper function to log status messages to the UI
 * @param {HTMLElement} container - Container element for displaying messages
 * @param {string} message - Message to display
 * @param {boolean} [isError=false] - Whether this is an error message
 */
function logStatus(container, message, isError = false) {
  if (!container) return;

  const messageElement = document.createElement('div');
  messageElement.innerHTML = message;

  if (isError) {
    messageElement.classList.add('error-message');
  } else {
    messageElement.classList.add('success-message');
  }

  container.appendChild(messageElement);

  // Auto-scroll to the bottom to show the latest message
  container.scrollTop = container.scrollHeight;
}

export { initWebGPU };