/**
 * Script to regenerate snapshot baselines
 * This script:
 * 1. Runs the tests with --update-snapshots flag
 * 2. Renames all snapshots to include "baseline" in the filename
 * 
 * Usage:
 *   node bin/snapshots-update.js [options]
 * 
 * Options:
 *   --skip-tests         Skip running tests and only rename existing snapshots
 *   --test-file <path>   Run tests only for the specified file
 *   --dry-run            Show what files would be renamed without making changes
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const SNAPSHOTS_DIR = path.join(process.cwd(), 'snapshots');

// Parse command line arguments
const args = process.argv.slice(2);
const skipTests = args.includes('--skip-tests');
const dryRun = args.includes('--dry-run');
const testFileIndex = args.indexOf('--test-file');
const testFile = testFileIndex !== -1 ? args[testFileIndex + 1] : null;

console.log('Starting baseline snapshots regeneration...');

let testsSucceeded = true;

if (!skipTests) {
  try {
    // Print a more informative message
    console.log('Running tests with --update-snapshots flag...');
    
    // Construct command based on whether a specific test file was provided
    let command = 'npx playwright test --update-snapshots';
    if (testFile) {
      command += ` ${testFile}`;
      console.log(`Running tests for specific file: ${testFile}`);
    }

    // Run playwright test with update-snapshots flag
    // Use execSync with stdio: 'inherit' to show real-time output
    execSync(command, {
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
    
    // Provide more specific guidance for common errors
    if (error.message && error.message.includes('does not provide an export named')) {
      console.error('\nThis appears to be a module import error. Check your import statements in test files.');
      console.error('The error suggests you\'re trying to import a non-existent export from a module.');
    }

    console.error('\nTry running tests first to ensure they pass before updating snapshots.');
    console.error('You can also try running the update command manually:');
    console.error('npx playwright test --update-snapshots');
    if (testFile) {
      console.error(`Or for just this file: npx playwright test --update-snapshots ${testFile}`);
    }
    console.error('\nAlternatively, run this script with --skip-tests to only rename existing snapshots.');

    console.log('\nAttempting to rename any generated snapshots anyway...');
    // Note: Not exiting here to allow renaming of any snapshots that were created
  }
} else {
  console.log('Skipping test execution as requested (--skip-tests)');
}

async function renameSnapshotsToBaselines() {
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Renaming snapshots to include "baseline" in the filename...`);

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

      // Rename the file or just log what would happen in dry run mode
      if (!dryRun) {
        await fs.rename(filePath, newPath);
      }
      console.log(`${dryRun ? '[DRY RUN] Would rename' : 'Renamed'}: ${file} → ${newName}`);
      renamedCount++;
    }

    console.log(`${dryRun ? '[DRY RUN] Would have renamed' : 'Renamed'} ${renamedCount} snapshot files to include "baseline" in the filename.`);
  } catch (error) {
    console.error('Error renaming snapshot files:', error);
    process.exit(1);
  }
}

// Call the function to rename snapshots
await renameSnapshotsToBaselines();
console.log('Snapshot baseline regeneration process completed.');

// Show a helpful message about the module error if applicable
if (!testsSucceeded && !skipTests) {
  console.log('\nNote: To fix the module import error, check the "./utils/performance-utils.js" file');
  console.log('Make sure it correctly exports the "getLighthouseScores" function that your tests are trying to import.');
}

// Only exit with error code if tests failed
if (!testsSucceeded && !skipTests) {
  process.exit(1);
}
