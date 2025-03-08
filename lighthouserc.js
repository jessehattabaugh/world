export default {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Available on',
      startServerReadyTimeout: 10000,
      numberOfRuns: 3,
      // staticDistDir is now specified in the CLI command
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'interactive': ['error', { maxNumericValue: 3500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
