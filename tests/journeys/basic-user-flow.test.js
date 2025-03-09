import { test, expect } from '../utils/test-utils.js';
import { HomePage } from '../pages/home/home-page.js';
// Import other page models as needed

// Complete user journey from homepage through site
test.describe('Complete user journey', () => {
  test('new user explores website and interacts with key features', async ({
    page, axeCheck, visualCheck, perfCheck
  }) => {
    // Step 1: Visit homepage
    const homePage = new HomePage(page);
    await homePage.goto();
    await visualCheck('journey-homepage');

    // Check performance at first page load
    await perfCheck('journey-initial-load');

    // Step 2: Toggle theme preference
    await homePage.toggleTheme();
    await visualCheck('journey-dark-theme');

    // Step 3: Interact with music player
    await homePage.toggleMusic();
    await visualCheck('journey-music-playing');

    // Step 4: Navigate to projects page
    await page.getByRole('link', { name: /projects/i }).click();
    await expect(page).toHaveURL(/.*projects/);
    await visualCheck('journey-projects');

    // Step 5: Check accessibility on this page
    await axeCheck();

    // Step 6: Navigate to about page
    await page.getByRole('link', { name: /about/i }).click();
    await expect(page).toHaveURL(/.*about/);
    await visualCheck('journey-about');

    // Step 7: Test form interaction on contact page
    await page.getByRole('link', { name: /contact/i }).click();
    await expect(page).toHaveURL(/.*contact/);

    // Fill out form fields
    await page.getByLabel('Name').fill('Test User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Message').fill('This is a test message from the automated journey test.');

    // Take visual snapshot of filled form
    await visualCheck('journey-contact-form-filled');

    // Submit form (but intercept to prevent actual submission in test)
    await page.route('**/api/contact', route => {return route.fulfill({ status: 200 })});
    await page.getByRole('button', { name: /send|submit/i }).click();

    // Check for success message
    await expect(page.getByText(/thank you|message received|success/i)).toBeVisible();
    await visualCheck('journey-form-submitted');

    // Test that theme preference was maintained throughout journey
    const hasDarkMode = await page.evaluate(() =>
      {return document.documentElement.classList.contains('dark-mode')}
    );
    expect(hasDarkMode).toBeTruthy('Theme preference should persist across pages');

    // Final performance check to see if site remains fast after interaction
    await perfCheck('journey-end');
  });
});
