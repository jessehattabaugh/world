/**
 * Script to regenerate snapshot baselines
 * This script:
 * 1. Runs the tests with --update-snapshots flag
 * 2. Renames all snapshots to include "baseline" in the filename
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const SNAPSHOTS_DIR = path.join(process.cwd(), 'snapshots');

console.log('Starting baseline snapshots regeneration...');

try {
  // Print a more informative message
  console.log('Running tests with --update-snapshots flag...');
  
  // Run playwright test with update-snapshots flag
  // Use execSync with stdio: 'inherit' to show real-time output
  execSync('npx playwright test --update-snapshots', {
    stdio: 'inherit',
    cwd: process.cwd(),
    encoding: 'utf8'
  });
  
  console.log('\nSuccessfully regenerated baseline snapshots!');
} catch (error) {
  console.error('\nFailed to regenerate baseline snapshots.');
  
  if (error.stdout) console.error(`Output: ${error.stdout}`);
  if (error.stderr) console.error(`Error: ${error.stderr}`);
  
  console.error('\nTry running tests first to ensure they pass before updating snapshots.');
  console.error('You can also try running the update command manually:');
  console.error('npx playwright test --update-snapshots');
  
  process.exit(1);
}

async function renameSnapshotsToBaselines() {
	console.log('Renaming snapshots to include "baseline" in the filename...');

	try {
		// Ensure directory exists
		try {
			await
