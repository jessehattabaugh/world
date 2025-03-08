/**
 * Main JavaScript file for the website
 * Handles theme toggling and other functionality
 */

// Set up theme toggle custom element
class ThemeToggle extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Initial render
    this.render();

    // Setup event listeners
    this.setupEvents();

    // Apply initial theme based on preference
    this.applyTheme();

    // Bind methods
    this.toggleTheme = this.toggleTheme.bind(this);

    console.debug('Theme toggle component initialized 🌓 ThemeToggle');
  }

  render() {
    const buttonStyle = `
      button {
        background: none;
        border: none;
        cursor: pointer;
        height: 40px;
        padding: 8px;
        position: relative;
        width: 40px;
        border-radius: 50%;
        transition: background-color 0.3s;
      }

      button:hover, button:focus {
        background-color: rgba(0, 0, 0, 0.1);
      }

      button:focus {
        outline: 2px solid var(--primary-color, #3498db);
        outline-offset: 2px;
      }

      .icon {
        width: 24px;
        height: 24px;
      }

      :host-context(.dark-mode) .light-icon {
        display: block;
      }

      :host-context(.dark-mode) .dark-icon {
        display: none;
      }

      .light-icon {
        display: none;
      }

      .dark-icon {
        display: block;
      }

      @media (prefers-reduced-motion: reduce) {
        button {
          transition: none;
        }
      }
    `;

    this.shadowRoot.innerHTML = `
      <style>${buttonStyle}</style>
      <button aria-label="Toggle theme" tabindex="0">
        <svg class="icon dark-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
        </svg>
        <svg class="icon light-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      </button>
    `;
  }

  setupEvents() {
    const button = this.shadowRoot.querySelector('button');
    button.addEventListener('click', this.toggleTheme);

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const theme = localStorage.getItem('theme-preference');
      if (theme === 'system') {
        this.applyTheme();
      }
    });
  }

  toggleTheme() {
    console.log('Theme toggle clicked 🌓 toggleTheme');
    const isDark = document.documentElement.classList.contains('dark-mode');

    // Toggle theme and save preference
    if (isDark) {
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('theme-preference', 'light');
    } else {
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('theme-preference', 'dark');
    }

    // Announce theme change for screen readers
    this.announceThemeChange();
  }

  applyTheme() {
    const theme = localStorage.getItem('theme-preference');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (theme === 'dark' || (theme === 'system' || !theme) && prefersDark) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }

  announceThemeChange() {
    const isDark = document.documentElement.classList.contains('dark-mode');
    const message = isDark ? 'Dark theme enabled' : 'Light theme enabled';

    // Create and use an ARIA live region to announce the change
    let announce = document.getElementById('theme-announce');
    if (!announce) {
      announce = document.createElement('div');
      announce.id = 'theme-announce';
      announce.setAttribute('aria-live', 'polite');
      announce.style.position = 'absolute';
      announce.style.width = '1px';
      announce.style.height = '1px';
      announce.style.padding = '0';
      announce.style.overflow = 'hidden';
      announce.style.clip = 'rect(0, 0, 0, 0)';
      announce.style.whiteSpace = 'nowrap';
      announce.style.border = '0';
      document.body.appendChild(announce);
    }

    announce.textContent = message;
  }
}

// Register the custom element
customElements.define('theme-toggle', ThemeToggle);

// Handle reduced motion preference
function setupReducedMotion() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    document.documentElement.classList.add('reduced-motion');
  }

  // Listen for changes to the prefers-reduced-motion media query
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => {
    if (event.matches) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  });
}

// Initialize functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded 🚀 DOMContentLoaded');

  // Set up reduced motion
  setupReducedMotion();

  // Update current year in footer
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Listen for carousel events
  const carousel = document.querySelector('image-carousel');
  if (carousel) {
    carousel.addEventListener('slide-change', (e) => {
      console.log(`Slide changed to ${e.detail.index + 1} of ${e.detail.total}`);
    });
  }
});

console.debug('index.js loaded');
