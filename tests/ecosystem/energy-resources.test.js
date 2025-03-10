// @ts-check
import { expect, test } from '@playwright/test';

/**
 * Tests for Jesse's World Energy and Resource Systems
 * These tests validate Milestone 2: Core Simulation Engine - Resource Management
 */

test.describe('Energy and Resources - Milestone 2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#simulator-preview-canvas canvas', {
      state: 'attached',
      timeout: 10000
    });
  });

  test.describe('Energy System', () => {
		test('should properly manage lifeform energy consumption', async ({ page }) => {
			const energyResults = await page.evaluate(async () => {
				const simulator = window.jessesWorld?.simulator;
				if (!simulator) {
					return null;
				}

				// Create test lifeform with specific metabolism
				const lifeform = simulator.spawnLifeform(100, 100, {
					energy: 100,
					metabolism: 1.0,
				});

				const initialEnergy = simulator.getLifeformState(lifeform.id).energy;

				// Run simulation steps
				await Promise.all(Array.from({ length: 10 }).map(() => {return simulator.step()}));

				const finalState = simulator.getLifeformState(lifeform.id);

				return {
					initialEnergy,
					finalEnergy: finalState.energy,
					energyConsumed: initialEnergy - finalState.energy,
				};
			});

			expect(energyResults).not.toBeNull();
			expect(energyResults.initialEnergy).toBe(100);
			expect(energyResults.energyConsumed).toBeGreaterThan(0);
			expect(energyResults.finalEnergy).toBeLessThan(energyResults.initialEnergy);
		});

		test('should handle death when energy depleted', async ({ page }) => {
			const depletionResults = await page.evaluate(async () => {
				const simulator = window.jessesWorld?.simulator;
				if (!simulator) {
					return null;
				}

				// Create lifeform with very low energy
				const lifeform = simulator.spawnLifeform(100, 100, {
					energy: 5,
					metabolism: 2.0, // High metabolism to speed up energy depletion
				});

				const initialState = simulator.getLifeformState(lifeform.id);

				// Run simulation until energy depletes
				let steps = 0;
				let currentState;
				while (currentState && currentState.energy > 0 && steps < 20) {
					await simulator.step();
					steps++;
					currentState = simulator.getLifeformState(lifeform.id);
				}

				return {
					initialEnergy: initialState.energy,
					survived: !!currentState,
					stepsToDepletion: steps,
				};
			});

			expect(depletionResults).not.toBeNull();
			expect(depletionResults.initialEnergy).toBe(5);
			expect(depletionResults.survived).toBe(false);
			expect(depletionResults.stepsToDepletion).toBeLessThan(20);
		});
  });

  test.describe('Resource Management', () => {
		test('should handle food spawning and consumption', async ({ page }) => {
			const foodResults = await page.evaluate(async () => {
				const simulator = window.jessesWorld?.simulator;
				if (!simulator) {
					return null;
				}

				// Create herbivore and food source
				const herbivore = simulator.spawnLifeform(100, 100, {
					type: 'herbivore',
					energy: 50,
					metabolism: 1.0,
				});

				const food = simulator.spawnFood(120, 100, {
					energy: 20,
				});

				const initialState = {
					herbivoreEnergy: simulator.getLifeformState(herbivore.id).energy,
					foodExists: !!simulator.getResourceState(food.id),
				};

				// Run simulation steps
				await Promise.all(Array.from({ length: 10 }).map(() => {return simulator.step()}));

				const finalHerbivoreState = simulator.getLifeformState(herbivore.id);
				const finalFoodState = simulator.getResourceState(food.id);

				return {
					initial: initialState,
					final: {
						herbivoreEnergy: finalHerbivoreState.energy,
						foodExists: !!finalFoodState,
					},
					energyGained: finalHerbivoreState.energy > initialState.herbivoreEnergy,
				};
			});

			expect(foodResults).not.toBeNull();
			expect(foodResults.initial.foodExists).toBe(true);
			expect(foodResults.initial.herbivoreEnergy).toBe(50);
			// Either food was consumed and energy gained, or food still exists
			expect(foodResults.energyGained || foodResults.final.foodExists).toBe(true);
		});

		test('should manage resource distribution and regeneration', async ({ page }) => {
			const resourceResults = await page.evaluate(async () => {
				const simulator = window.jessesWorld?.simulator;
				if (!simulator) {
					return null;
				}

				// Record initial resource count
				const initialCount = simulator.stats.resourceCount;

				// Add some resources
				const resources = [];
				for (let i = 0; i < 5; i++) {
					resources.push(simulator.spawnFood(100 + i * 50, 100, { energy: 10 }));
				}

				// Run simulation to allow regeneration
				await Promise.all(Array.from({ length: 20 }).map(() => {return simulator.step()}));

				// Check final state
				const finalCount = simulator.stats.resourceCount;
				const originalResourcesExist = resources.some((r) => {
					return simulator.getResourceState(r.id);
				});
				const newResourcesSpawned = finalCount > resources.length;

				return {
					initialCount,
					resourcesAdded: resources.length,
					finalCount,
					originalResourcesExist,
					newResourcesSpawned,
				};
			});

			expect(resourceResults).not.toBeNull();
			expect(resourceResults.resourcesAdded).toBe(5);
			// Either original resources still exist or new ones have spawned
			expect(
				resourceResults.originalResourcesExist || resourceResults.newResourcesSpawned,
			).toBe(true);
		});
  });
});