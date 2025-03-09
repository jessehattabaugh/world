/**
 * Neural Network for Entity Decision Making
 * 
 * Implements a simple feed-forward neural network with:
 * - 4 input neurons (food distance/angle, predator distance/angle)
 * - 8 hidden neurons
 * - 4 output neurons (movement direction/speed, reproduction, attack)
 */
export class NeuralNetwork {
    constructor() {
        this.architecture = {
            inputSize: 4,
            hiddenSize: 8,
            outputSize: 4
        };

        // Initialize weights and biases
        this.weights = {
            inputHidden: new Float32Array(this.architecture.inputSize * this.architecture.hiddenSize),
            hiddenOutput: new Float32Array(this.architecture.hiddenSize * this.architecture.outputSize)
        };

        this.biases = {
            hidden: new Float32Array(this.architecture.hiddenSize),
            output: new Float32Array(this.architecture.outputSize)
        };

        // Initialize with random weights
        this.randomizeWeights();

        // Input and output layer definitions for tests
        this.inputLayer = [
            'nearestFoodDistance',
            'nearestFoodAngle',
            'nearestPredatorDistance',
            'nearestPredatorAngle'
        ];

        this.outputLayer = [
            'moveDirection',
            'moveSpeed',
            'reproduce',
            'attack'
        ];
    }

    /**
     * Initialize weights with random values
     */
    randomizeWeights() {
        // Helper to generate random weights
        const randomWeight = () => (Math.random() * 2 - 1) * 0.1;

        // Initialize input->hidden weights
        for (let i = 0; i < this.weights.inputHidden.length; i++) {
            this.weights.inputHidden[i] = randomWeight();
        }

        // Initialize hidden->output weights
        for (let i = 0; i < this.weights.hiddenOutput.length; i++) {
            this.weights.hiddenOutput[i] = randomWeight();
        }

        // Initialize biases
        for (let i = 0; i < this.biases.hidden.length; i++) {
            this.biases.hidden[i] = randomWeight();
        }
        for (let i = 0; i < this.biases.output.length; i++) {
            this.biases.output[i] = randomWeight();
        }
    }

    /**
     * Convert network data to GPU-compatible format
     */
    toGPUFormat() {
        // Combine all weights and biases into a single array
        const data = new Float32Array(
            this.weights.inputHidden.length +
            this.weights.hiddenOutput.length +
            this.biases.hidden.length +
            this.biases.output.length
        );

        let offset = 0;

        // Copy input->hidden weights
        data.set(this.weights.inputHidden, offset);
        offset += this.weights.inputHidden.length;

        // Copy hidden->output weights
        data.set(this.weights.hiddenOutput, offset);
        offset += this.weights.hiddenOutput.length;

        // Copy hidden biases
        data.set(this.biases.hidden, offset);
        offset += this.biases.hidden.length;

        // Copy output biases
        data.set(this.biases.output, offset);

        return data;
    }

    /**
     * Create a child network through crossover of two parents
     */
    static crossover(parent1, parent2) {
        const child = new NeuralNetwork();

        // Helper for crossover
        const crossoverArrays = (arr1, arr2) => {
            const result = new Float32Array(arr1.length);
            for (let i = 0; i < arr1.length; i++) {
                // 50% chance to inherit from each parent
                result[i] = Math.random() < 0.5 ? arr1[i] : arr2[i];
            }
            return result;
        };

        // Crossover weights
        child.weights.inputHidden = crossoverArrays(
            parent1.weights.inputHidden,
            parent2.weights.inputHidden
        );
        child.weights.hiddenOutput = crossoverArrays(
            parent1.weights.hiddenOutput,
            parent2.weights.hiddenOutput
        );

        // Crossover biases
        child.biases.hidden = crossoverArrays(
            parent1.biases.hidden,
            parent2.biases.hidden
        );
        child.biases.output = crossoverArrays(
            parent1.biases.output,
            parent2.biases.output
        );

        return child;
    }

    /**
     * Apply random mutations to weights and biases
     */
    mutate(rate = 0.1, amount = 0.2) {
        const mutateArray = (arr) => {
            for (let i = 0; i < arr.length; i++) {
                if (Math.random() < rate) {
                    // Add random mutation within specified amount
                    arr[i] += (Math.random() * 2 - 1) * amount;
                }
            }
        };

        // Mutate weights
        mutateArray(this.weights.inputHidden);
        mutateArray(this.weights.hiddenOutput);

        // Mutate biases
        mutateArray(this.biases.hidden);
        mutateArray(this.biases.output);
    }
}