/**
 * Jesse's World - Main Initialization Script
 *
 * This script initializes the ecosystem simulator on the homepage
 */

import { EcosystemSimulator } from './engine/ecosystem-simulator.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.debug('🌍 Initializing Jesse\'s World...');

  // Create the simulator instance for the preview section
  const previewSimulator = new EcosystemSimulator('simulator-preview-canvas', {
    width: 800,
    height: 500,
    tileSize: 200,  // Smaller tiles for better parallelization
    maxEntitiesPerTile: 100,
    autoStart: false
  });

  // Store the simulator instance on the window for access from developer console
  window.jessesWorld = previewSimulator;

  // Initialize UI feedback
  initializeUIFeedback();

  console.debug('🌍 Jesse\'s World initialization complete');
});

/**
 * Initialize UI feedback for browser compatibility
 */
function initializeUIFeedback() {
  // Check for WebGPU support
  const hasWebGPU = 'gpu' in navigator;

  // Update compatibility notice if it exists
  const compatNotice = document.getElementById('compatibility-notice');
  if (compatNotice) {
    if (hasWebGPU) {
      compatNotice.innerHTML = '<span class="success-message">✓ Your browser supports WebGPU</span>';
    } else {
      compatNotice.innerHTML = '<span class="warning-message">⚠️ Your browser doesn\'t support WebGPU. Using CPU fallback.</span>';
    }
  }

  // Check for other required features
  const features = [
    { name: 'WebGPU', supported: 'gpu' in navigator },
    { name: 'Web Workers', supported: 'Worker' in window },
    { name: 'OffscreenCanvas', supported: 'OffscreenCanvas' in window },
    { name: 'Service Workers', supported: 'serviceWorker' in navigator }
  ];

  // Log feature support
  console.debug('🔍 Feature detection:', features.reduce((obj, feature) => {
    obj[feature.name] = feature.supported;
    return obj;
  }, {}));
}