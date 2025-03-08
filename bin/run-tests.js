/**
 * Script to run all tests in sequence with proper error handling and reporting
 *
 * Usage:
 *   node bin/run-tests.js [--skip=test1,test2] [--only=test3,test4] [--bail]
 *
 * Options:
 *   --skip=test1,test2   Skip the specified test scripts
 *   --only=test3,test4   Run only the specified test scripts
 *   --bail               Stop on first failure
 *   --ci                 Run in CI mode (more concise output)
 */

import { execSync } from 'child_process';
import { spawn } from 'child_process';

// Parse command line arguments
const args = process.argv.slice(2);
const skipArg = args.find(arg => {return arg.startsWith('--skip=')});
const onlyArg = args.find(arg => {return arg.startsWith('--only=')});
const shouldBail = args.includes('--bail');
const ciMode = args.includes('--ci');

// Parse skipped tests
const skippedTests = skipArg
  ? skipArg.replace('--skip=', '').split(',')
  : [];

// Parse tests to run
const onlyTests = onlyArg
  ? onlyArg.replace('--only=', '').split(',')
  : [];

// Define all test scripts in the desired sequence
const allTestScripts = [
  { name: 'clean-snapshots', script: 'test:clean-snapshots', description: 'Cleaning snapshots' },
  { name: 'lint', script: 'lint', description: 'Linting code' },
  { name: 'local', script: 'test:local', description: 'Running local tests' },
  { name: 'perf', script: 'test:perf', description: 'Running performance tests' },
  { name: 'staging', script: 'test:staging', description: 'Running staging tests' },
  { name: 'prod', script: 'test:prod', description: 'Running production tests' }
];

// Filter tests based on command line arguments
const testsToRun = allTestScripts.filter(test => {
  if (onlyTests.length > 0) {
    return onlyTests.includes(test.name);
  }
  return !skippedTests.includes(test.name);
});

console.log('Starting test sequence:');
testsToRun.forEach((test, i) => {
  console.log(`${i + 1}. ${test.description}`);
});

// Function to run a command with proper output handling
async function runCommand(command) {
  return new Promise((resolve, reject) => {
    const proc = spawn('npm', ['run', command], {
      stdio: ciMode ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      shell: true
    });

    let output = '';

    if (ciMode) {
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        output += data.toString();
      });
    }

    proc.on('close', (code) => {
      if (code === 0) {
        if (ciMode) {
          console.log(`✓ Successfully ran ${command}`);
        }
        resolve();
      } else {
        if (ciMode) {
          console.error(`Failed running ${command}:`);
          console.error(output);
        }
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

// Run tests in sequence
async function runTests() {
  const startTime = Date.now();
  const results = [];

  for (const [index, test] of testsToRun.entries()) {
    const testStartTime = Date.now();
    console.log(`\n[${index + 1}/${testsToRun.length}] ${test.description}...`);

    try {
      await runCommand(test.script);
      const duration = ((Date.now() - testStartTime) / 1000).toFixed(2);
      results.push({ name: test.name, success: true, duration });
      console.log(`✓ ${test.description} completed successfully (${duration}s)`);
    } catch (error) {
      const duration = ((Date.now() - testStartTime) / 1000).toFixed(2);
      results.push({ name: test.name, success: false, duration, error: error.message });
      console.error(`✗ ${test.description} failed (${duration}s)`);

      if (shouldBail) {
        console.error('Stopping due to failure (--bail flag)');
        break;
      }
    }
  }

  // Generate report
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const successful = results.filter(r => {return r.success}).length;

  console.log('\n==== Test Results ====');
  console.log(`${successful}/${results.length} tests passed (${totalTime}s total)`);

  results.forEach(result => {
    const icon = result.success ? '✓' : '✗';
    console.log(`${icon} ${result.name} (${result.duration}s)`);
  });

  // Show test report if any tests ran
  if (results.length > 0) {
    try {
      console.log('\nGenerating test report...');
      execSync('npm run test:report', { stdio: 'ignore' });
      console.log('Test report available. Run "npx playwright show-report" to view it.');
    } catch (e) {
      console.warn('Could not generate test report.');
    }
  }

  // Exit with error code if any test failed
  if (results.some(r => {return !r.success})) {
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});
