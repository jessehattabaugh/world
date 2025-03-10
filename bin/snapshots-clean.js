/**
 * Clean snapshot files except for baseline images
 * This replaces the rimraf command in package.json
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const SNAPSHOTS_DIR = path.join(process.cwd(), 'snapshots');

async function cleanSnapshots() {
	console.log('Cleaning snapshots directory...');

	try {
		// Check if snapshots directory exists
		try {
			await fs.access(SNAPSHOTS_DIR);
		} catch {
			console.log(`Creating snapshots directory at ${SNAPSHOTS_DIR}`);
			await fs.mkdir(SNAPSHOTS_DIR, { recursive: true });
			return;
		}

		// Get all files and directories in the snapshots directory
		const items = await fs.readdir(SNAPSHOTS_DIR);

		// Filter out baseline files and markdown files
		const itemsToRemove = items.filter((item) => {
			return !item.includes('baseline') && !item.endsWith('.md');
		});

		// Delete each item that's not a baseline or .md file
		const cleanPromises = itemsToRemove.map(async (item) => {
			const itemPath = path.join(SNAPSHOTS_DIR, item);

			// Check if it's a file or directory
			const stats = await fs.stat(itemPath);

			if (stats.isDirectory()) {
				// For directories, use recursive removal
				await fs.rm(itemPath, { recursive: true, force: true });
				console.log(`Deleted directory: ${item}`);
			} else {
				// For files, use unlink
				await fs.unlink(itemPath);
				console.log(`Deleted file: ${item}`);
			}
		});

		await Promise.all(cleanPromises);

		console.log('Snapshot cleanup complete!');

		// Try to restore baseline files from git if any were deleted
		try {
			execSync('git checkout -- ./snapshots/*baseline*', { stdio: 'inherit' });
			console.log('Restored any missing baseline files from git');
		} catch {
			// It's okay if this fails, could be that there are no git-tracked baselines yet
			console.log('Note: No baseline files needed to be restored from git');
		}
	} catch (error) {
		console.error('Error cleaning snapshots:', error);
		process.exit(1);
	}
}

// Run the cleanup function
cleanSnapshots();
