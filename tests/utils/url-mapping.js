/**
 * URL mapping utilities for tests
 */

// Map external test domains to local dev server
export function mapTestUrl(url) {
  // Handle string URLs
  if (typeof url === 'string') {
    // Replace jessesworld.example.com with localhost:3000
    if (url.includes('jessesworld.example.com')) {
      return url.replace(/https?:\/\/jessesworld\.example\.com/g, 'http://localhost:3000');
    }
  }
  return url;
}

// Get the real test URL (mapped from example domains to local server)
export function getTestUrl(path = '/') {
  const baseUrl = 'http://localhost:3000';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

// Format a page ID from a URL for consistent file naming
export function formatPageId(url) {
  if (typeof url === 'string') {
    // This will keep the format https:--jessesworld.example.com in file paths
    // but make sure we're testing against localhost
    return url.replace(/^https?:\/\//, 'https:--').replace(/\/$/, '');
  }
  return 'unknown-page';
}