// @ts-check
import { expect, test } from '@playwright/test';

/**
 * Tests for Jesse's World Ecosystem Mechanics
 * These tests validate Milestone 2: Core Simulation Engine - Interaction Mechanics
 */

test.describe('Ecosystem Mechanics - Milestone 2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for simulator initialization
    await page.waitForSelector('#simulator-preview-canvas canvas', {
      state: 'attached',
      timeout: 10000
    });
  });

  test.describe('Predation Mechanics', () => {
    test('should detect and handle predator-prey interactions', async ({ page }) => {
      const predationResults = await page.evaluate(async () => {
        const simulator = window.jessesWorld?.simulator;
        if (!simulator) {return null;}

        // Create predator and prey
        const predator = simulator.spawnLifeform(100, 100, {
          type: 'predator',
          speed: 3.0,
          senseRange: 60,
          strength: 2.0
        });

        const prey = simulator.spawnLifeform(120, 100, {
          type: 'prey',
          speed: 2.0,
          senseRange: 50
        });

        const initialPredatorEnergy = simulator.getLifeformState(predator.id).energy;
        const initialPreyEnergy = simulator.getLifeformState(prey.id).energy;

        // Run several simulation steps
        for (let i = 0; i < 5; i++) {
          await simulator.step();
        }

        // Get updated states
        const predatorState = simulator.getLifeformState(predator.id);
        const preyState = simulator.getLifeformState(prey.id);

        return {
          initialStates: {
            predatorEnergy: initialPredatorEnergy,
            preyEnergy: initialPreyEnergy
          },
          finalStates: {
            predatorEnergy: predatorState.energy,
            preyAlive: !!preyState,
            interaction: predatorState.energy > initialPredatorEnergy || !preyState
          }
        };
      });

      expect(predationResults).not.toBeNull();
      expect(predationResults.initialStates.predatorEnergy).toBeGreaterThan(0);
      expect(predationResults.initialStates.preyEnergy).toBeGreaterThan(0);
      // Either predator gained energy from eating prey, or prey escaped
      expect(predationResults.finalStates.interaction).toBe(true);
    });
  });

  test.describe('Reproduction System', () => {
    test('should handle reproduction between compatible lifeforms', async ({ page }) => {
      const reproductionResults = await page.evaluate(async () => {
        const simulator = window.jessesWorld?.simulator;
        if (!simulator) {return null;}

        // Create two compatible lifeforms
        const parent1 = simulator.spawnLifeform(100, 100, {
          type: 'herbivore',
          maturity: 1.0,
          energy: 100
        });

        const parent2 = simulator.spawnLifeform(105, 100, {
          type: 'herbivore',
          maturity: 1.0,
          energy: 100
        });

        const initialCount = simulator.stats.entityCount;

        // Trigger reproduction
        const child = await simulator.reproduce(parent1.id, parent2.id);
        const childState = simulator.getLifeformState(child.id);
        const parent1State = simulator.getLifeformState(parent1.id);
        const parent2State = simulator.getLifeformState(parent2.id);

        return {
          reproductionSucceeded: !!childState,
          populationIncreased: simulator.stats.entityCount > initialCount,
          parentsLostEnergy:
            parent1State.energy < 100 &&
            parent2State.energy < 100,
          childInheritsType: childState.type === 'herbivore'
        };
      });

      expect(reproductionResults).not.toBeNull();
      expect(reproductionResults.reproductionSucceeded).toBe(true);
      expect(reproductionResults.populationIncreased).toBe(true);
      expect(reproductionResults.parentsLostEnergy).toBe(true);
      expect(reproductionResults.childInheritsType).toBe(true);
    });

    test('should prevent reproduction between incompatible types', async ({ page }) => {
      const incompatibleResults = await page.evaluate(async () => {
        const simulator = window.jessesWorld?.simulator;
        if (!simulator) {return null;}

        // Create two incompatible lifeforms
        const predator = simulator.spawnLifeform(100, 100, {
          type: 'predator',
          maturity: 1.0,
          energy: 100
        });

        const prey = simulator.spawnLifeform(105, 100, {
          type: 'herbivore',
          maturity: 1.0,
          energy: 100
        });

        const initialCount = simulator.stats.entityCount;

        // Attempt reproduction
        try {
          await simulator.reproduce(predator.id, prey.id);
          return {
            preventedReproduction: false,
            populationUnchanged: simulator.stats.entityCount === initialCount
          };
        } catch (e) {
          return {
            preventedReproduction: true,
            populationUnchanged: simulator.stats.entityCount === initialCount
          };
        }
      });

      expect(incompatibleResults).not.toBeNull();
      expect(incompatibleResults.preventedReproduction).toBe(true);
      expect(incompatibleResults.populationUnchanged).toBe(true);
    });
  });

  test.describe('Mutation System', () => {
    test('should apply random mutations during reproduction', async ({ page }) => {
      const mutationResults = await page.evaluate(async () => {
        const simulator = window.jessesWorld?.simulator;
        if (!simulator) {return null;}

        // Create parent lifeforms with identical genes
        const baseGenes = {
          speed: 2.0,
          senseRange: 50,
          metabolism: 1.0,
          size: 1.0
        };

        const parent1 = simulator.spawnLifeform(100, 100, {
          ...baseGenes,
          energy: 100,
          maturity: 1.0
        });

        const parent2 = simulator.spawnLifeform(105, 100, {
          ...baseGenes,
          energy: 100,
          maturity: 1.0
        });

        // Create multiple children to test mutation
        const children = [];
        for (let i = 0; i < 5; i++) {
          const child = await simulator.reproduce(parent1.id, parent2.id);
          children.push(simulator.getLifeformState(child.id));
        }

        // Check for genetic variations
        const variations = children.map(child => {return {
          speedDiff: Math.abs(child.genes.speed - baseGenes.speed),
          senseDiff: Math.abs(child.genes.senseRange - baseGenes.senseRange),
          metabolismDiff: Math.abs(child.genes.metabolism - baseGenes.metabolism),
          sizeDiff: Math.abs(child.genes.size - baseGenes.size)
        }});

        return {
          // Check if at least some children have mutations
          hasMutations: variations.some(v =>
            {return v.speedDiff > 0 ||
            v.senseDiff > 0 ||
            v.metabolismDiff > 0 ||
            v.sizeDiff > 0}
          ),
          // Verify mutations are within acceptable ranges
          mutationsInRange: variations.every(v =>
            {return v.speedDiff <= baseGenes.speed * 0.2 && // Max 20% mutation
            v.senseDiff <= baseGenes.senseRange * 0.2 &&
            v.metabolismDiff <= baseGenes.metabolism * 0.2 &&
            v.sizeDiff <= baseGenes.size * 0.2}
          )
        };
      });

      expect(mutationResults).not.toBeNull();
      expect(mutationResults.hasMutations).toBe(true);
      expect(mutationResults.mutationsInRange).toBe(true);
    });
  });
});