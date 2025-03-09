const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Attempts to navigate to a URL with retries and fallback
 * @param {Page} page Playwright page object
 * @param {string} primaryUrl Primary URL to attempt
 * @param {string} fallbackUrl Fallback URL if primary fails
 * @param {Object} options Navigation options
 */
export async function navigateWithFallback(page, primaryUrl, fallbackUrl, options = {}) {
  let lastError;

  // Try primary URL first
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await page.goto(primaryUrl, options);
      return;
    } catch (error) {
      lastError = error;
      if (i < MAX_RETRIES - 1) {
        await page.waitForTimeout(RETRY_DELAY);
      }
    }
  }

  // Try fallback URL if primary fails
  try {
    console.warn(`Failed to access ${primaryUrl}, falling back to ${fallbackUrl}`);
    await page.goto(fallbackUrl, options);
  } catch (error) {
    throw new Error(`Navigation failed for both primary (${primaryUrl}) and fallback (${fallbackUrl}) URLs.\nOriginal error: ${lastError.message}`);
  }
}
