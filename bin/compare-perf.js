#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Comparing performance metrics...');

// Define paths for performance data
const perfDataDir = path.join(__dirname, '../perf-data');
const baselinePath = path.join(perfDataDir, 'baseline.json');
const currentPath = path.join(perfDataDir, 'current.json');

// Ensure the perf-data directory exists
if (!fs.existsSync(perfDataDir)) {
  fs.mkdirSync(perfDataDir, { recursive: true });
  console.log(`Created directory: ${perfDataDir}`);
}

// Check if we have both files to compare
const baselineExists = fs.existsSync(baselinePath);
const currentExists = fs.existsSync(currentPath);

// If we don't have baseline data, create a sample one
if (!baselineExists) {
  const sampleBaseline = {
    timestamp: new Date().toISOString(),
    metrics: {
      loadTime: 500,
      renderTime: 200,
      totalTime: 700,
      memoryUsage: 50
    }
  };

  fs.writeFileSync(baselinePath, JSON.stringify(sampleBaseline, null, 2));
  console.log(`Created sample baseline data in ${baselinePath}`);
}

// If we don't have current data, create a sample one
if (!currentExists) {
  const sampleCurrent = {
    timestamp: new Date().toISOString(),
    metrics: {
      loadTime: 520,
      renderTime: 190,
      totalTime: 710,
      memoryUsage: 52
    }
  };

  fs.writeFileSync(currentPath, JSON.stringify(sampleCurrent, null, 2));
  console.log(`Created sample current data in ${currentPath}`);
}

// Now we can compare the two
try {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'));

  console.log('\nPerformance Comparison:');
  console.log('======================');
  console.log(`Baseline: ${baseline.timestamp}`);
  console.log(`Current: ${current.timestamp}`);
  console.log('======================');

  // Compare each metric and calculate percentage change
  Object.keys(baseline.metrics).forEach(metric => {
    const baseValue = baseline.metrics[metric];
    const currentValue = current.metrics[metric];
    const diff = currentValue - baseValue;
    const percentChange = ((diff / baseValue) * 100).toFixed(2);

    console.log(`${metric}:`);
    console.log(`  Baseline: ${baseValue}`);
    console.log(`  Current: ${currentValue}`);
    console.log(`  Change: ${diff > 0 ? '+' : ''}${diff} (${percentChange}%)`);
  });

  console.log('\nPerformance comparison completed.');
} catch (error) {
  console.error('Error comparing performance data:', error);
  process.exit(1);
}
