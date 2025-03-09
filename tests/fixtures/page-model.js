/**
 * Base Page Object Model to encapsulate page interactions
 */
export class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = '/';
    this.pageId = 'base-page';
    this.pageTitle = 'Base Page';
  }

  /**
   * Navigate to this page
   * @param {Object} options Navigation options
   */
  async goto(options = {}) {
    await this.page.goto(this.url, {
      waitUntil: 'networkidle',
      ...options
    });
    return this;
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForLoaded() {
    // Wait for critical elements to be visible
    await Promise.all([
      this.page.waitForLoadState('networkidle'),
      this.page.waitForLoadState('domcontentloaded')
    ]);
    return this;
  }

  /**
   * Get all links on the page
   */
  async getLinks() {
    return this.page.getByRole('link').all();
  }

  /**
   * Take a screenshot with meaningful name
   */
  async screenshot(name, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${this.pageId}-${name}-${timestamp}.png`;
    await this.page.screenshot({
      path: `screenshots/${filename}`,
      ...options
    });
    return filename;
  }

  /**
   * Check accessibility of the page
   * @param {Function} axeCheck Accessibility check fixture
   */
  async checkAccessibility(axeCheck) {
    return axeCheck();
  }

  /**
   * Check performance of the page
   * @param {Function} perfCheck Performance check fixture
   */
  async checkPerformance(perfCheck) {
    return perfCheck(this.pageId);
  }
}
