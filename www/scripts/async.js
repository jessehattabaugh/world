// JavaScript that doesn't require the DOM be fully parsed

// Feature detection and polyfill loading
const modernFeatures = {
	viewTransitions: 'startViewTransition' in document,
	intersectionObserver: 'IntersectionObserver' in window,
	resizeObserver: 'ResizeObserver' in window,
	containerQueries: CSS.supports('container-type: inline-size'),
	colorScheme: window.matchMedia('(prefers-color-scheme: dark)').media !== 'not all',
};

console.debug('Feature detection:', modernFeatures);

// Register service worker for PWA capabilities
if ('serviceWorker' in navigator) {
	window.addEventListener('load', async () => {
		try {
			const registration = await navigator.serviceWorker.register('/sw.js', {
				scope: '/',
			});
			console.debug('👨‍🏭® service worker registered', registration.scope);

			// Set up periodic background sync if supported
			if ('periodicSync' in registration) {
				// Request permission for background sync
				const status = await navigator.permissions.query({
					name: 'periodic-background-sync',
				});

				if (status.state === 'granted') {
					try {
						await registration.periodicSync.register('content-sync', {
							minInterval: 24 * 60 * 60 * 1000, // 1 day
						});
						console.debug('Periodic background sync registered');
					} catch (error) {
						console.warn('Periodic background sync registration failed:', error);
					}
				}
			}
		} catch (exception) {
			console.error('👨‍🏭⚠ service worker failed', exception);
		}
	});
}

// Preconnect to critical domains
function addPreconnect(url) {
	const link = document.createElement('link');
	link.rel = 'preconnect';
	link.href = url;
	document.head.appendChild(link);
}

// Add DNS-prefetch for faster resource loading
function addDnsPrefetch(url) {
	const link = document.createElement('link');
	link.rel = 'dns-prefetch';
	link.href = url;
	document.head.appendChild(link);
}

// Add critical performance optimizations
const criticalDomains = ['https://storage.googleapis.com'];
for (const domain of criticalDomains) {
	addPreconnect(domain);
	addDnsPrefetch(domain);
}

// Detect network status
function updateNetworkStatus() {
	const isOnline = navigator.onLine;
	document.documentElement.classList.toggle('offline', !isOnline);

	if (!isOnline) {
		console.debug('App is offline');
	}
}

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
updateNetworkStatus();

/**
 * Async JavaScript - Loaded immediately without blocking rendering
 */

// Set initial color scheme based on user preference
(function() {
  const theme = localStorage.getItem('theme-preference');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (theme === 'dark' || (theme === 'system' || !theme) && prefersDark) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }

  // Set up reduced motion early to prevent unwanted animations
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('reduced-motion');
  }
})();

// Register service worker if supported
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
		.register('/service-worker.js')
		.then(({ scope }) => {
			console.info('ServiceWorker registration successful! 🛠️ registerServiceWorker');
		})
		.catch((error) => {
			console.error('ServiceWorker registration failed: 🔥', error);
		});
  });
}

// Initialize performance monitoring
(function() {
  // Only run on browsers that support the Performance API
  if (!window.performance) {return;}

  // Track navigation timing metrics
  const performanceTiming = performance.getEntriesByType('navigation')[0];

  if (performanceTiming) {
    window.addEventListener('load', () => {
      // Give the browser a moment to complete layout
      setTimeout(() => {
        const navTiming = performance.getEntriesByType('navigation')[0];
        const paintEntries = performance.getEntriesByType('paint');

        const metrics = {
          TTFB: navTiming.responseStart - navTiming.requestStart,
          FCP: paintEntries.find(entry => {return entry.name === 'first-contentful-paint'})?.startTime || 0,
          DOMLoad: navTiming.domContentLoadedEventEnd - navTiming.fetchStart,
          Load: navTiming.loadEventEnd - navTiming.fetchStart
        };

        // Log metrics
        console.info('Performance metrics:', metrics);
      }, 0);
    });
  }

  // Set up PerformanceObserver for LCP and CLS if available
  if ('PerformanceObserver' in window) {
    try {
      // Observe Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const lcpEntry = entries[entries.length - 1];
          console.info(`LCP: ${lcpEntry.startTime.toFixed(1)}ms`);
        }
      }).observe({type: 'largest-contentful-paint', buffered: true});

      // Observe Cumulative Layout Shift
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        console.info(`CLS: ${clsValue.toFixed(3)}`);
      }).observe({type: 'layout-shift', buffered: true});
    } catch (e) {
      console.warn('Performance observation not supported:', e);
    }
  }
})();
