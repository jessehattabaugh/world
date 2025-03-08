/**
 * Utility functions for performance testing and Lighthouse score processing
 */

/**
 * Get Lighthouse scores from a performance report
 * @param {Object} report - The Lighthouse report object
 * @returns {Object} Object containing performance scores by category
 */
export function getLighthouseScores(report = {}) {
  // Default implementation - replace with actual implementation as needed
  const categories = report.categories || {};

  return {
    performance: categories.performance?.score || 0,
    accessibility: categories.accessibility?.score || 0,
    bestPractices: categories['best-practices']?.score || 0,
    seo: categories.seo?.score || 0,
    pwa: categories.pwa?.score || 0,
    // Add any additional metrics you need from the report
  };
}

/**
 * Format Lighthouse scores for display
 * @param {Object} scores - Object containing performance scores
 * @returns {Object} Formatted scores (as percentages)
 */
export function formatScores(scores = {}) {
  const formatted = {};

  // Convert decimal scores to percentages
  Object.entries(scores).forEach(([key, value]) => {
    formatted[key] = typeof value === 'number' ? Math.round(value * 100) : 0;
  });

  return formatted;
}
