/**
 * Main Entry Point
 *
 * Initializes and exposes the ecosystem simulator globally
 */

import { EcosystemSimulator } from './engine/ecosystem-simulator.js';

// Initialize simulator when DOM is ready
window.addEventListener('DOMContentLoaded', async () => {
    // Create global namespace
    window.jessesWorld = {
        simulator: null
    };

    try {
        // Create and initialize simulator
        const simulator = new EcosystemSimulator('simulator-preview-canvas', {
            width: 800,
            height: 600,
            showStats: true
        });

        const initialized = await simulator.initialize();

        if (initialized) {
            // Store simulator instance globally
            window.jessesWorld.simulator = simulator;

            // Enable UI controls
            const spawnButton = document.getElementById('spawn-life');
            const toggleButton = document.getElementById('toggle-simulation');
            const resetButton = document.getElementById('reset-preview');
            const entityCountEl = document.getElementById('entity-count');
            const fpsCounterEl = document.getElementById('fps-counter');

            if (spawnButton) {
                spawnButton.disabled = false;
                spawnButton.addEventListener('click', () => {
                    // Spawn at random position
                    const x = Math.random() * simulator.options.width;
                    const y = Math.random() * simulator.options.height;
                    simulator.spawnLifeform({ x, y });
                });
            }

            if (toggleButton) {
                toggleButton.disabled = false;
                toggleButton.addEventListener('click', () => {
                    if (simulator.isRunning) {
                        simulator.stop();
                        toggleButton.textContent = 'Start';
                    } else {
                        simulator.start();
                        toggleButton.textContent = 'Stop';
                    }
                });
            }

            if (resetButton) {
                resetButton.disabled = false;
                resetButton.addEventListener('click', () => {
                    simulator.resetSimulation();
                    if (toggleButton) toggleButton.textContent = 'Start';
                });
            }

            // Update stats every frame
            const updateStats = () => {
                if (entityCountEl) {
                    entityCountEl.textContent = simulator.stats.entityCount;
                }
                if (fpsCounterEl) {
                    fpsCounterEl.textContent = simulator.stats.fps;
                }
                requestAnimationFrame(updateStats);
            };
            updateStats();

            // Update compatibility notice
            const compatNotice = document.getElementById('compatibility-notice');
            if (compatNotice) {
                if (simulator.features.webGPU) {
                    compatNotice.innerHTML = '<span class="success-message">✓ Your browser supports WebGPU</span>';
                } else {
                    compatNotice.innerHTML = '<span class="warning-message">⚠️ Your browser doesn\'t support WebGPU. Using CPU fallback.</span>';
                }
            }
        } else {
            console.error('Failed to initialize simulator');
        }
    } catch (error) {
        console.error('Error initializing simulator:', error);
    }
});