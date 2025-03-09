#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create necessary directories
const dirs = [
  path.join(__dirname, '../snapshots'),
  path.join(__dirname, '../snapshots/diffs'),
  path.join(__dirname, '../perf-data')
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

console.log('Directory setup complete!');
