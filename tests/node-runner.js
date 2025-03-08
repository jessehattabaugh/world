/**
 * Node.js test runner helper script
 *
 * This script helps run the Node.js built-in test runner with proper configuration
 * Usage: node tests/node-runner.js [pattern]
 *
 * Example:
 * - Run all tests: node tests/node-runner.js
 * - Run specific tests: node tests/node-runner.js "Theme Toggle"
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pattern = process.argv[2] || '';

// List of test directories to scan
const testDirectories = [
  'components',
  'flows',
  'pages',
  'performance'
];

/**
 * Find test files matching pattern
 */
function findTestFiles(pattern) {
  const testFiles = [];

  // Always include setup.js first
  testFiles.push(path.join(__dirname, 'setup.js'));

  // Find test files in each directory
  for (const dir of testDirectories) {
    const dirPath = path.join(__dirname, dir);

    if (fs.existsSync(dirPath)) {
      const files = findFilesRecursively(dirPath, pattern);
      testFiles.push(...files);
    }
  }

  // Also include any tests in the root test directory matching the pattern
  const rootFiles = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.test.js') &&
      (pattern === '' || file.toLowerCase().includes(pattern.toLowerCase())))
    .map(file => path.join(__dirname, file));

  testFiles.push(...rootFiles);

  return testFiles;
}

/**
 * Find files recursively in directory
 */
function findFilesRecursively(dir, pattern) {
  let results = [];
  const list = fs.readdirSync(dir);

  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively search in subdirectories
      results = results.concat(findFilesRecursively(filePath, pattern));
    } else if (file.endsWith('.test.js') &&
               (pattern === '' || filePath.toLowerCase().includes(pattern.toLowerCase()))) {
      results.push(filePath);
    }
  }

  return results;
}

// Find test files
const testFiles = findTestFiles(pattern);

if (testFiles.length <= 1) {
  console.log('No test files found matching:', pattern);
  process.exit(1);
}

console.log(`Running tests${pattern ? ' matching: ' + pattern : ''}`);
console.log('Test files:');
testFiles.forEach((file, i) => {
  if (i > 0) console.log(`- ${path.relative(__dirname, file)}`);
});

// Run tests with Node.js test runner
const args = [
  '--test',
  '--test-reporter=spec',
  ...testFiles
];

const nodeProcess = spawn('node', args, { stdio: 'inherit' });

nodeProcess.on('close', code => {
  process.exit(code);
});
