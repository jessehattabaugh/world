/**
 * Neural Network for Entity Decision Making
 *
 * Optimized implementation that:
 * - Uses TypedArrays for better performance
 * - Implements efficient matrix operations
 * - Supports WebGPU-compatible data format
 */
export class NeuralNetwork {
    constructor(config = {}) {
        this.architecture = {
            inputSize: config.inputSize || 4,
            hiddenSize: config.hiddenSize || 8,
            outputSize: config.outputSize || 4
        };

        // Use TypedArrays for better performance
        this.weights = {
            input: new Float32Array(this.architecture.inputSize * this.architecture.hiddenSize),
            hidden: new Float32Array(this.architecture.hiddenSize * this.architecture.outputSize)
        };

        this.biases = {
            hidden: new Float32Array(this.architecture.hiddenSize),
            output: new Float32Array(this.architecture.outputSize)
        };

        if (!config.weights) {
            this.randomizeWeights();
        } else {
            this.setWeights(config.weights);
        }
    }

    randomizeWeights() {
        for (let i = 0; i < this.weights.input.length; i++) {
            this.weights.input[i] = (Math.random() * 2 - 1) * Math.sqrt(2 / this.architecture.inputSize);
        }
        for (let i = 0; i < this.weights.hidden.length; i++) {
            this.weights.hidden[i] = (Math.random() * 2 - 1) * Math.sqrt(2 / this.architecture.hiddenSize);
        }
        for (let i = 0; i < this.biases.hidden.length; i++) {
            this.biases.hidden[i] = (Math.random() * 0.2 - 0.1);
        }
        for (let i = 0; i < this.biases.output.length; i++) {
            this.biases.output[i] = (Math.random() * 0.2 - 0.1);
        }
    }

    forward(input) {
        const hidden = new Float32Array(this.architecture.hiddenSize);
        const output = new Float32Array(this.architecture.outputSize);

        // Input -> Hidden layer (with ReLU activation)
        for (let i = 0; i < this.architecture.hiddenSize; i++) {
            let sum = this.biases.hidden[i];
            for (let j = 0; j < this.architecture.inputSize; j++) {
                sum += input[j] * this.weights.input[i * this.architecture.inputSize + j];
            }
            hidden[i] = Math.max(0, sum); // ReLU activation
        }

        // Hidden -> Output layer (with sigmoid activation)
        for (let i = 0; i < this.architecture.outputSize; i++) {
            let sum = this.biases.output[i];
            for (let j = 0; j < this.architecture.hiddenSize; j++) {
                sum += hidden[j] * this.weights.hidden[i * this.architecture.hiddenSize + j];
            }
            output[i] = 1 / (1 + Math.exp(-sum)); // Sigmoid activation
        }

        return output;
    }

    // Convert network to GPU-compatible format
    toGPUFormat() {
        const totalSize =
            this.weights.input.length +
            this.weights.hidden.length +
            this.biases.hidden.length +
            this.biases.output.length;

        const buffer = new Float32Array(totalSize);
        let offset = 0;

        // Pack weights and biases sequentially
        buffer.set(this.weights.input, offset);
        offset += this.weights.input.length;
        buffer.set(this.weights.hidden, offset);
        offset += this.weights.hidden.length;
        buffer.set(this.biases.hidden, offset);
        offset += this.biases.hidden.length;
        buffer.set(this.biases.output, offset);

        return buffer;
    }

    static crossover(parent1, parent2, mutationRate = 0.1) {
        const child = new NeuralNetwork({
            inputSize: parent1.architecture.inputSize,
            hiddenSize: parent1.architecture.hiddenSize,
            outputSize: parent1.architecture.outputSize
        });

        // Crossover weights using single-point crossover
        for (const layer of ['input', 'hidden']) {
            const crossPoint = Math.floor(Math.random() * parent1.weights[layer].length);
            for (let i = 0; i < parent1.weights[layer].length; i++) {
                // Choose weight from either parent
                child.weights[layer][i] = i < crossPoint ?
                    parent1.weights[layer][i] :
                    parent2.weights[layer][i];

                // Apply mutation
                if (Math.random() < mutationRate) {
                    child.weights[layer][i] += (Math.random() * 0.4 - 0.2);
                }
            }
        }

        // Crossover biases
        for (const layer of ['hidden', 'output']) {
            const crossPoint = Math.floor(Math.random() * parent1.biases[layer].length);
            for (let i = 0; i < parent1.biases[layer].length; i++) {
                child.biases[layer][i] = i < crossPoint ?
                    parent1.biases[layer][i] :
                    parent2.biases[layer][i];

                if (Math.random() < mutationRate) {
                    child.biases[layer][i] += (Math.random() * 0.4 - 0.2);
                }
            }
        }

        return child;
    }

    // Clone the network
    clone() {
        const clone = new NeuralNetwork(this.architecture);
        clone.weights.input.set(this.weights.input);
        clone.weights.hidden.set(this.weights.hidden);
        clone.biases.hidden.set(this.biases.hidden);
        clone.biases.output.set(this.biases.output);
        return clone;
    }

    setWeights(weights) {
        if (weights.input) {this.weights.input.set(weights.input);}
        if (weights.hidden) {this.weights.hidden.set(weights.hidden);}
        if (weights.hiddenBias) {this.biases.hidden.set(weights.hiddenBias);}
        if (weights.outputBias) {this.biases.output.set(weights.outputBias);}
    }
}