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

let testsSucceeded = true;

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
  testsSucceeded = false;
  console.error('\nFailed to regenerate baseline snapshots.');

  if (error.stdout) {console.error(`Output: ${error.stdout}`);}
  if (error.stderr) {console.error(`Error: ${error.stderr}`);}

  console.error('\nTry running tests first to ensure they pass before updating snapshots.');
  console.error('You can also try running the update command manually:');
  console.error('npx playwright test --update-snapshots');

  console.log('\nAttempting to rename any generated snapshots anyway...');
  // Note: Not exiting here to allow renaming of any snapshots that were created
}

async function renameSnapshotsToBaselines() {
  console.log('Renaming snapshots to include "baseline" in the filename...');

  try {
    // Ensure directory exists
    try {
      await fs.access(SNAPSHOTS_DIR);
    } catch (error) {
      console.error(`Snapshots directory not found: ${SNAPSHOTS_DIR}`);
      return;
    }

    // Get all files in the snapshots directory
    const files = await fs.readdir(SNAPSHOTS_DIR);

    let renamedCount = 0;

    for (const file of files) {
      // Skip files that already have "baseline" in the name
      if (file.includes('baseline')) {
        continue;
      }

      const filePath = path.join(SNAPSHOTS_DIR, file);
      const fileInfo = path.parse(filePath);

      // Create new filename with baseline in it
      const newName = `${fileInfo.name}-baseline${fileInfo.ext}`;
      const newPath = path.join(SNAPSHOTS_DIR, newName);

      // Rename the file
      await fs.rename(filePath, newPath);
      console.log(`Renamed: ${file} → ${newName}`);
      renamedCount++;
    }

    console.log(`Renamed ${renamedCount} snapshot files to include "baseline" in the filename.`);
  } catch (error) {
    console.error('Error renaming snapshot files:', error);
    process.exit(1);
  }
}

// Call the function to rename snapshots
await renameSnapshotsToBaselines();
console.log('Snapshot baseline regeneration process completed.');

// Only exit with error code if tests failed
if (!testsSucceeded) {
  process.exit(1);
}
