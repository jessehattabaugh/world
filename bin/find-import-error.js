/**
 * Utility script to help find where an import error is occurring
 * Run this to locate files that are trying to import from './utils/performance-utils.js'
 */

import { execSync } from 'child_process';

async function findImportReferences() {
  console.log("Searching for files that import './utils/performance-utils.js'...");

  try {
    // Use grep to find files containing the import statement
    const grepCommand = "grep -r \"import.*from.*['\\\"]./utils/performance-utils.js['\\\"]\" --include=\"*.js\" .";

    const result = execSync(grepCommand, {
      cwd: process.cwd(),
      encoding: 'utf8'
    });

    console.log('\nFiles with matching import statements:');
    console.log(result);

    console.log('\nRecommendation:');
    console.log('Check these files and verify the path to utils/performance-utils.js is correct');
    console.log('You might need to adjust the import path or create the file in the expected location');
  } catch (error) {
    if (error.status === 1) {
      console.log('No matching files found. The import might be in a non-JS file or use a different path format.');
    } else {
      console.error('Error searching for files:', error.message);
    }
  }

  // Also look for dynamic imports
  try {
		const dynamicGrepCommand =
			'grep -r "import(.*utils/performance-utils.js.*)" --include="*.js" .';

		const dynamicResult = execSync(dynamicGrepCommand, {
			cwd: process.cwd(),
			encoding: 'utf8',
		});

		if (dynamicResult) {
			console.log('\nFiles with dynamic imports:');
			console.log(dynamicResult);
		}
  } catch {
		// Ignore if no matches
  }
}

await findImportReferences();

console.log('\nNext Steps:');
console.log('1. Run: node bin/find-import-error.js');
console.log('2. Check the output files and fix the import paths');
console.log('3. If needed, create the performance-utils.js file in the correct location');
console.log('4. Try running tests again with: npx playwright test --update-snapshots');
