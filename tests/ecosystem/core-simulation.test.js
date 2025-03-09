// @ts-check
import { expect, test } from '@playwright/test';

/**
 * Tests for Jesse's World Core Simulation Engine
 * These tests validate Milestone 2: Core Simulation Engine
 */

test.describe('Core Simulation Engine - Milestone 2', () => {
  test.describe('Lifeform Data Structures', () => {
    test('should properly initialize lifeform buffer with correct structure', async ({ page }) => {
      await page.goto('/');

      // Wait for simulator to initialize
      await page.waitForSelector('#simulator-preview-canvas canvas', {
        state: 'attached',
        timeout: 10000
      });

      // Verify lifeform buffer structure
      const bufferStructure = await page.evaluate(() => {
        const simulator = window.jessesWorld?.simulator;
        if (!simulator?.lifeformBuffer) {return null;}

        return {
          // Check buffer attributes match our data structure
          stride: simulator.lifeformBuffer.stride,
          capacity: simulator.lifeformBuffer.capacity,
          attributes: Object.keys(simulator.lifeformBuffer.attributes)
        };
      });

      expect(bufferStructure).not.toBeNull();
      expect(bufferStructure.attributes).toContain('position');
      expect(bufferStructure.attributes).toContain('energy');
      expect(bufferStructure.attributes).toContain('genes');
      expect(bufferStructure.stride).toBeGreaterThan(0);
    });

    test('should be able to spawn and track multiple lifeforms', async ({ page }) => {
      await page.goto('/');

      // Wait for simulator
      await page.waitForSelector('#simulator-preview-canvas canvas', {
        state: 'attached'
      });

      // Test spawning multiple lifeforms
      const spawnResults = await page.evaluate(() => {
        const simulator = window.jessesWorld?.simulator;
        if (!simulator) {return null;}

        // Spawn test lifeforms
        const positions = [
          { x: 100, y: 100 },
          { x: 200, y: 200 },
          { x: 300, y: 300 }
        ];

        const lifeforms = positions.map(pos =>
          {return simulator.spawnLifeform(pos.x, pos.y)}
        );

        return {
          spawnedCount: lifeforms.length,
          totalCount: simulator.stats.entityCount,
          hasValidIds: lifeforms.every(l => {return l.id >= 0}),
          uniqueIds: new Set(lifeforms.map(l => {return l.id})).size
        };
      });

      expect(spawnResults).not.toBeNull();
      expect(spawnResults.spawnedCount).toBe(3);
      expect(spawnResults.totalCount).toBeGreaterThan(0);
      expect(spawnResults.hasValidIds).toBe(true);
      expect(spawnResults.uniqueIds).toBe(3); // All IDs should be unique
    });
  });

  test.describe('Compute Shader Integration', () => {
    test('should compile and bind compute shaders successfully', async ({ page }) => {
      await page.goto('/');

      const shaderStatus = await page.evaluate(() => {
        const simulator = window.jessesWorld?.simulator;
        if (!simulator?.computePipeline) {return null;}

        return {
          hasUpdatePipeline: !!simulator.computePipeline.update,
          hasPhysicsPipeline: !!simulator.computePipeline.physics,
          bindGroupLayout: !!simulator.computePipeline.bindGroupLayout
        };
      });

      expect(shaderStatus).not.toBeNull();
      expect(shaderStatus.hasUpdatePipeline).toBe(true);
      expect(shaderStatus.hasPhysicsPipeline).toBe(true);
      expect(shaderStatus.bindGroupLayout).toBe(true);
    });

    test('should update lifeform states through compute shader', async ({ page }) => {
      await page.goto('/');

      // Test that lifeform states are updated by compute shader
      const updateResults = await page.evaluate(async () => {
        const simulator = window.jessesWorld?.simulator;
        if (!simulator) {return null;}

        // Spawn a test lifeform
        const lifeform = simulator.spawnLifeform(100, 100);
        const initialState = simulator.getLifeformState(lifeform.id);

        // Run a few simulation steps
        await simulator.step();
        await simulator.step();

        const updatedState = simulator.getLifeformState(lifeform.id);

        return {
          hasStateChanged:
            initialState.position.x !== updatedState.position.x ||
            initialState.position.y !== updatedState.position.y ||
            initialState.energy !== updatedState.energy,
          initialEnergy: initialState.energy,
          updatedEnergy: updatedState.energy
        };
      });

      expect(updateResults).not.toBeNull();
      expect(updateResults.hasStateChanged).toBe(true);
      expect(updateResults.initialEnergy).toBeGreaterThan(0);
      expect(updateResults.updatedEnergy).toBeLessThanOrEqual(updateResults.initialEnergy);
    });
  });

  test.describe('Genetic System', () => {
    test('should properly initialize lifeforms with genetic traits', async ({ page }) => {
      await page.goto('/');

      const geneticResults = await page.evaluate(() => {
        const simulator = window.jessesWorld?.simulator;
        if (!simulator) {return null;}

        // Spawn parent lifeform with specific genes
        const parent = simulator.spawnLifeform(100, 100, {
          speed: 2.0,
          senseRange: 50,
          metabolism: 1.0
        });

        const {genes} = simulator.getLifeformState(parent.id);

        return {
          hasGenes: !!genes,
          geneCount: Object.keys(genes).length,
          speedInRange: genes.speed >= 0.5 && genes.speed <= 5.0,
          senseInRange: genes.senseRange >= 10 && genes.senseRange <= 100,
          metabolismInRange: genes.metabolism >= 0.5 && genes.metabolism <= 2.0
        };
      });

      expect(geneticResults).not.toBeNull();
      expect(geneticResults.hasGenes).toBe(true);
      expect(geneticResults.geneCount).toBeGreaterThanOrEqual(3);
      expect(geneticResults.speedInRange).toBe(true);
      expect(geneticResults.senseInRange).toBe(true);
      expect(geneticResults.metabolismInRange).toBe(true);
    });

    test('should properly handle genetic inheritance and mutation', async ({ page }) => {
      await page.goto('/');

      const inheritanceResults = await page.evaluate(async () => {
        const simulator = window.jessesWorld?.simulator;
        if (!simulator) {return null;}

        // Create parent lifeforms
        const parent1 = simulator.spawnLifeform(100, 100, {
          speed: 2.0,
          senseRange: 50,
          metabolism: 1.0
        });

        const parent2 = simulator.spawnLifeform(120, 100, {
          speed: 3.0,
          senseRange: 60,
          metabolism: 1.5
        });

        // Trigger reproduction
        const child = await simulator.reproduce(parent1.id, parent2.id);
        const childGenes = simulator.getLifeformState(child.id).genes;
        const parent1Genes = simulator.getLifeformState(parent1.id).genes;
        const parent2Genes = simulator.getLifeformState(parent2.id).genes;

        return {
          childHasGenes: !!childGenes,
          // Check if child genes are within valid ranges of parents
          speedInRange: childGenes.speed >= Math.min(parent1Genes.speed, parent2Genes.speed) * 0.8 &&
                       childGenes.speed <= Math.max(parent1Genes.speed, parent2Genes.speed) * 1.2,
          senseInRange: childGenes.senseRange >= Math.min(parent1Genes.senseRange, parent2Genes.senseRange) * 0.8 &&
                       childGenes.senseRange <= Math.max(parent1Genes.senseRange, parent2Genes.senseRange) * 1.2,
          metabolismInRange: childGenes.metabolism >= Math.min(parent1Genes.metabolism, parent2Genes.metabolism) * 0.8 &&
                           childGenes.metabolism <= Math.max(parent1Genes.metabolism, parent2Genes.metabolism) * 1.2
        };
      });

      expect(inheritanceResults).not.toBeNull();
      expect(inheritanceResults.childHasGenes).toBe(true);
      expect(inheritanceResults.speedInRange).toBe(true);
      expect(inheritanceResults.senseInRange).toBe(true);
      expect(inheritanceResults.metabolismInRange).toBe(true);
    });
  });

  test.describe('Neural Network Decision Making', () => {
    test('should initialize neural networks for lifeforms', async ({ page }) => {
      await page.goto('/');

      const nnResults = await page.evaluate(() => {
        const simulator = window.jessesWorld?.simulator;
        if (!simulator) {return null;}

        const lifeform = simulator.spawnLifeform(100, 100);
        const network = simulator.getNeuralNetwork(lifeform.id);

        return {
          hasNetwork: !!network,
          inputCount: network?.inputLayer?.length,
          hiddenCount: network?.hiddenLayers?.[0]?.length,
          outputCount: network?.outputLayer?.length,
          // Basic structure validation
          hasInputs: network?.inputLayer?.includes('nearestFoodDistance') &&
                    network?.inputLayer?.includes('nearestPredatorDistance'),
          hasOutputs: network?.outputLayer?.includes('moveDirection') &&
                     network?.outputLayer?.includes('moveSpeed')
        };
      });

      expect(nnResults).not.toBeNull();
      expect(nnResults.hasNetwork).toBe(true);
      expect(nnResults.inputCount).toBeGreaterThan(0);
      expect(nnResults.hiddenCount).toBeGreaterThan(0);
      expect(nnResults.outputCount).toBeGreaterThan(0);
      expect(nnResults.hasInputs).toBe(true);
      expect(nnResults.hasOutputs).toBe(true);
    });

    test('should process neural network decisions in compute shader', async ({ page }) => {
      await page.goto('/');

      const decisionResults = await page.evaluate(async () => {
        const simulator = window.jessesWorld?.simulator;
        if (!simulator) {return null;}

        // Create test scenario
        const lifeform = simulator.spawnLifeform(100, 100);
        simulator.spawnFood(150, 100); // Food to the right

        const initialState = simulator.getLifeformState(lifeform.id);

        // Run simulation steps
        await simulator.step();
        await simulator.step();

        const updatedState = simulator.getLifeformState(lifeform.id);

        return {
          // Check if lifeform moved in response to food
          responsiveMovement:
            Math.abs(updatedState.position.x - initialState.position.x) > 0 ||
            Math.abs(updatedState.position.y - initialState.position.y) > 0,
          // Check if moving generally toward food
          movingTowardFood: updatedState.position.x > initialState.position.x,
          energyChanged: updatedState.energy !== initialState.energy
        };
      });

      expect(decisionResults).not.toBeNull();
      expect(decisionResults.responsiveMovement).toBe(true);
      expect(decisionResults.movingTowardFood).toBe(true);
      expect(decisionResults.energyChanged).toBe(true);
    });
  });
});