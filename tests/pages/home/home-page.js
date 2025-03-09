import { BasePage } from '../../fixtures/page-model.js';

export class HomePage extends BasePage {
  constructor(page) {
    super(page);
    this.url = '/';
    this.pageId = 'homepage';
    this.pageTitle = 'Homepage';

    // Page-specific selectors
    this.heroSection = page.locator('.hero');
    this.heroHeading = page.locator('.hero h2');
    this.featuredProjects = page.locator('.card-grid');
    this.themeToggle = page.locator('theme-toggle');
    this.musicToggle = page.locator('#music-toggle');
  }

  /**
   * Toggle the theme
   */
  async toggleTheme() {
    await this.themeToggle.click();
    // Wait for theme change to take effect
    await this.page.waitForTimeout(300);
    return this;
  }

  /**
   * Toggle music player
   */
  async toggleMusic() {
    await this.musicToggle.click();
    // Wait for audio to start
    await this.page.waitForTimeout(500);
    return this;
  }

  /**
   * Get the hero animation state
   */
  async getHeroAnimationState() {
    return {
      opacity: await this.heroHeading.evaluate(el =>
        {return window.getComputedStyle(el).opacity}
      ),
      transform: await this.heroHeading.evaluate(el =>
        {return window.getComputedStyle(el).transform}
      )
    };
  }

  /**
   * Check if lazy loaded images are working
   */
  async checkLazyLoadedImages() {
    return this.page.$$eval('img[loading="lazy"]',
      imgs => {return imgs.map(img => {return {
        src: img.currentSrc,
        loaded: img.complete && img.naturalWidth > 0
      }})}
    );
  }
}
