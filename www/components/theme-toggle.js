/**
 * Theme Toggle Web Component
 *
 * A custom element that toggles between light and dark themes.
 * - Syncs with system preferences by default
 * - Remembers user preference in localStorage
 * - Supports keyboard navigation and ARIA attributes
 *
 * @example
 * <theme-toggle role="switch" aria-label="Toggle theme" class="fancy-toggle"></theme-toggle>
 */

class ThemeToggle extends HTMLElement {
  static get observedAttributes() {
    return ['role', 'aria-label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Create the toggle structure
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --toggle-width: 60px;
          --toggle-height: 30px;
          --toggle-padding: 4px;
          --toggle-border-radius: 30px;
          --toggle-handle-size: calc(var(--toggle-height) - 2 * var(--toggle-padding));
          --toggle-bg-light: #e8f7e9;
          --toggle-bg-dark: #0a1e12;
          --toggle-border-light: rgba(127, 224, 132, 0.5);
          --toggle-border-dark: rgba(127, 224, 132, 0.2);
          --transition-speed: 0.3s;
        }

        .toggle {
          position: relative;
          width: var(--toggle-width);
          height: var(--toggle-height);
          background-color: var(--toggle-bg-dark);
          border-radius: var(--toggle-border-radius);
          border: 1px solid var(--toggle-border-dark);
          cursor: pointer;
          transition: background-color var(--transition-speed);
          display: flex;
          align-items: center;
          padding: 0 var(--toggle-padding);
        }

        .toggle[aria-checked="true"] {
          background-color: var(--toggle-bg-light);
          border-color: var(--toggle-border-light);
        }

        .toggle:focus-visible {
          outline: 2px solid #7fe084;
          outline-offset: 2px;
        }

        .handle {
          position: absolute;
          left: var(--toggle-padding);
          width: var(--toggle-handle-size);
          height: var(--toggle-handle-size);
          border-radius: 50%;
          background-color: #7fe084;
          transition: transform var(--transition-speed);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toggle[aria-checked="true"] .handle {
          transform: translateX(calc(var(--toggle-width) - var(--toggle-handle-size) - 2 * var(--toggle-padding)));
        }

        .icon {
          display: block;
          width: 16px;
          height: 16px;
          color: #0a1e12;
        }

        .sun-icon {
          display: none;
        }

        .moon-icon {
          display: block;
        }

        .toggle[aria-checked="true"] .sun-icon {
          display: block;
        }

        .toggle[aria-checked="true"] .moon-icon {
          display: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .toggle, .handle {
            transition: none;
          }
        }
      </style>

      <div class="toggle" tabindex="0" role="switch" aria-checked="false">
        <span class="handle">
          <svg class="icon sun-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm0-18a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0V2a1 1 0 0 1 1-1zm0 18a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1zM4.22 5.64a1 1 0 0 1 1.41 0l1.42 1.42a1 1 0 0 1-1.42 1.41L4.22 7.06a1 1 0 0 1 0-1.42zm12.73 12.73a1 1 0 0 1 1.41 0l1.42 1.42a1 1 0 0 1-1.42 1.41l-1.41-1.42a1 1 0 0 1 0-1.41zM2 13h2a1 1 0 0 1 0 2H2a1 1 0 0 1 0-2zm18 0h2a1 1 0 0 1 0 2h-2a1 1 0 0 1 0-2zM4.22 18.36l1.42-1.42a1 1 0 0 1 1.41 1.42l-1.42 1.41a1 1 0 0 1-1.41-1.41zm12.73-12.73l1.42-1.42a1 1 0 1 1 1.41 1.42l-1.42 1.41a1 1 0 1 1-1.41-1.41z"/>
          </svg>
          <svg class="icon moon-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22c5.523 0 10-4.477 10-10 0-.463-.207-.897-.54-1.192-.442-.39-1.068-.367-1.494.06-.853.854-2.006 1.332-3.206 1.332-2.485 0-4.5-2.015-4.5-4.5 0-1.2.478-2.354 1.332-3.207.427-.426.45-1.052.06-1.494C13.358 2.691 12.95 2.5 12.5 2.5 7.977 2.5 4 6.477 4 11c0 5.523 4.477 10 10 10z"/>
          </svg>
        </span>
      </div>
    `;

    // Access elements
    this.toggle = this.shadowRoot.querySelector('.toggle');

    // Bind event handlers
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  connectedCallback() {
    // Set up event listeners
    this.toggle.addEventListener('click', this.handleClick);
    this.toggle.addEventListener('keydown', this.handleKeyDown);

    // Apply ARIA attributes from host element
    if (this.hasAttribute('role')) {
      this.toggle.setAttribute('role', this.getAttribute('role'));
    }

    if (this.hasAttribute('aria-label')) {
      this.toggle.setAttribute('aria-label', this.getAttribute('aria-label'));
    }

    // Initialize theme based on stored preference or system preference
    this.initializeTheme();
  }

  disconnectedCallback() {
    // Clean up event listeners
    this.toggle.removeEventListener('click', this.handleClick);
    this.toggle.removeEventListener('keydown', this.handleKeyDown);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.toggle) {
      if (name === 'role' || name === 'aria-label') {
        this.toggle.setAttribute(name, newValue);
      }
    }
  }

  initializeTheme() {
    // Check local storage for user preference
    const storedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Set theme based on stored preference or system preference
    if (storedTheme === 'dark' || (storedTheme === null && prefersDark)) {
      this.setDarkTheme();
    } else {
      this.setLightTheme();
    }

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      // Only change if user hasn't explicitly set a preference
      if (!localStorage.getItem('theme')) {
        if (e.matches) {
          this.setDarkTheme();
        } else {
          this.setLightTheme();
        }
      }
    });
  }

  handleClick() {
    if (this.toggle.getAttribute('aria-checked') === 'true') {
      this.setLightTheme();
    } else {
      this.setDarkTheme();
    }
  }

  handleKeyDown(event) {
    // Toggle on Space or Enter
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.handleClick();
    }
  }

  setDarkTheme() {
    document.documentElement.classList.add('dark-mode');
    this.toggle.setAttribute('aria-checked', 'true');
    localStorage.setItem('theme', 'dark');

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('themechange', {
      detail: { theme: 'dark' }
    }));

    // Log for performance tracking
    console.debug('🌱 Theme changed to dark 🌙 theme-toggle');
  }

  setLightTheme() {
    document.documentElement.classList.remove('dark-mode');
    this.toggle.setAttribute('aria-checked', 'false');
    localStorage.setItem('theme', 'light');

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('themechange', {
      detail: { theme: 'light' }
    }));

    // Log for performance tracking
    console.debug('🌱 Theme changed to light ☀️ theme-toggle');
  }
}

// Define the custom element
customElements.define('theme-toggle', ThemeToggle);
