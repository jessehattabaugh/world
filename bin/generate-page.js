#!/usr/bin/env node

/**
 * Page Generator Utility
 *
 * Creates a new HTML page, adds it to the sitemap.xml,
 * and generates test scaffolding for it.
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise, Builder } from 'xml2js';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const wwwDir = path.join(rootDir, 'www');
const sitemapPath = path.join(wwwDir, 'sitemap.xml');

/**
 * Generate a title from a URL path
 * @param {string} urlPath URL path to convert to a title
 * @returns {string} Generated title
 */
function generatePageTitle(urlPath) {
	// Remove leading and trailing slashes
	const cleanPath = urlPath.replace(/^\/|\/$/g, '');

	// If empty, it's the homepage
	if (!cleanPath) {
		return 'Homepage';
	}

	// Get last segment of the path
	const lastSegment = cleanPath.split('/').pop();

	// Convert to title case
	return lastSegment
		.split('-')
		.map((word) => {
			return word.charAt(0).toUpperCase() + word.slice(1);
		})
		.join(' ');
}

// Get arguments from command line
const args = process.argv.slice(2);
if (args.length < 1) {
	console.error('❌ Error: Please provide a page path (e.g., /products/new-product)');
	process.exit(1);
}

const pagePath = args[0].startsWith('/') ? args[0] : `/${args[0]}`;
const pageTitle = args[1] || generatePageTitle(pagePath);

/**
 * Convert page path to filesystem path
 * @param {string} pagePath URL path of the page
 * @returns {string} Filesystem path
 */
function getFilesystemPath(pagePath) {
	// Handle root path
	if (pagePath === '/' || pagePath === '') {
		return path.join(wwwDir, 'index.html');
	}

	// Remove leading slash and handle directory structure
	const relativePath = pagePath.replace(/^\//, '');

	// If the path doesn't end with .html, create a directory with index.html
	if (!relativePath.endsWith('.html')) {
		return path.join(wwwDir, relativePath, 'index.html');
	}

	return path.join(wwwDir, relativePath);
}

/**
 * Generate HTML template for new page
 * @param {string} title Page title
 * @returns {string} HTML content
 */
function generateHtmlTemplate(title) {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="/styles/main.css">
  <meta name="description" content="${title} page">
</head>
<body>
  <header>
    <nav>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
        <!-- Add more navigation links as needed -->
      </ul>
    </nav>
  </header>

  <main>
    <h1>${title}</h1>
    <p>This is the ${title} page.</p>

    <!-- Add your content here -->
    <section>
      <h2>Section Title</h2>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
    </section>
  </main>

  <footer>
    <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
  </footer>

  <script src="/js/main.js"></script>
</body>
</html>`;
}

/**
 * Add page to sitemap.xml
 * @param {string} pagePath URL path of the page
 */
async function addToSitemap(pagePath) {
	// Base URL from environment or default
	const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

	let sitemapData;

	// Check if sitemap exists
	if (existsSync(sitemapPath)) {
		// Read and parse existing sitemap
		const sitemapContent = await fs.readFile(sitemapPath, 'utf-8');
		sitemapData = await parseStringPromise(sitemapContent);
	} else {
		// Create new sitemap structure
		sitemapData = {
			urlset: {
				$: {
					xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
				},
				url: [],
			},
		};
	}

	// Ensure urlset and url array exist
	if (!sitemapData.urlset) {
		sitemapData.urlset = {
			$: { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' },
			url: [],
		};
	}
	if (!sitemapData.urlset.url) {
		sitemapData.urlset.url = [];
	}

	// Create full URL
	const fullUrl = new URL(pagePath, baseUrl).toString();

	// Check if URL already exists
	const urlExists = sitemapData.urlset.url.some((entry) => {
		return entry.loc && entry.loc[0] === fullUrl;
	});

	if (!urlExists) {
		// Add new URL
		sitemapData.urlset.url.push({
			loc: [fullUrl],
			lastmod: [new Date().toISOString().split('T')[0]],
			changefreq: ['weekly'],
			priority: [pagePath === '/' ? '1.0' : '0.8'],
		});

		// Convert back to XML and write to file
		const builder = new Builder();
		const xml = builder.buildObject(sitemapData);
		await fs.writeFile(sitemapPath, xml);

		console.log(`✅ Added ${fullUrl} to sitemap.xml`);
	} else {
		console.log(`ℹ️ URL ${fullUrl} already exists in sitemap.xml`);
	}

	return fullUrl;
}

/**
 * Main function to create a new page
 */
async function createNewPage() {
	try {
		// Get file path for the new page
		const filePath = getFilesystemPath(pagePath);
		const dirPath = path.dirname(filePath);

		// Check if file already exists
		if (existsSync(filePath)) {
			console.error(`❌ Error: Page already exists at ${filePath}`);
			process.exit(1);
		}

		// Create directory structure if it doesn't exist
		await fs.mkdir(dirPath, { recursive: true });

		// Generate and write HTML content
		const htmlContent = generateHtmlTemplate(pageTitle);
		await fs.writeFile(filePath, htmlContent);
		console.log(`✅ Created new page at ${filePath}`);

		// Update sitemap
		const fullUrl = await addToSitemap(pagePath);

		// Generate test scaffolding
		console.log('🧪 Generating test scaffolding...');
		try {
			execSync(`node ${path.join(__dirname, 'generate-test-scaffold.js')}`);
			console.log('✅ Test scaffolding generated successfully');
		} catch (error) {
			console.error('⚠️ Warning: Error generating test scaffolding:', error.message);
		}

		console.log(`
🎉 Page creation complete!
   - Page URL: ${fullUrl}
   - File Path: ${filePath}
   - Page Title: ${pageTitle}

   To view your page, start the server with:
   npm start
    `);
	} catch (error) {
		console.error('❌ Error creating page:', error);
		process.exit(1);
	}
}

// Run the main function
createNewPage();
