import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

const reportDir = path.join(process.cwd(), 'reports', 'security');

// Ensure report directory exists
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

/**
 * Check security headers against best practices
 * @param {Object} headers Response headers
 * @returns {Object} Result of header check
 */
export async function checkHeaders(headers) {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.CI;

  // Required security headers
  const requiredHeaders = {
    'strict-transport-security': (value) => { return value.includes('max-age='); },
    'x-content-type-options': (value) => { return value === 'nosniff'; },
    'x-frame-options': (value) => { return ['DENY', 'SAMEORIGIN'].includes(value); },
    'content-security-policy': (value) => { return value.length > 0; },
    'referrer-policy': (value) => { return value.length > 0; },
    'permissions-policy': (value) => { return value.length > 0; },
  };

  const results = {
    pass: true,
    details: [],
    message: '',
  };

  // Check each required header
  for (const [header, validator] of Object.entries(requiredHeaders)) {
    const value = headers[header] || '';
    const isValid = validator(value);

    results.details.push({
      header,
      value,
      pass: isValid,
    });

    // In dev mode, don't fail the test, just warn
    if (!isValid && !isDev) {
      results.pass = false;
    }
  }

  // Generate summary message
  const failedHeaders = results.details
    .filter((detail) => { return !detail.pass; })
    .map((detail) => { return detail.header; });

  if (failedHeaders.length > 0) {
    results.message = `Missing or invalid security headers: ${failedHeaders.join(', ')}`;

    // In dev mode, don't fail the test
    if (isDev) {
      console.warn(`[DEV MODE] ${results.message}`);
      results.pass = true;  // Force pass in dev
    }
  }

  return results;
}

/**
 * Test Content Security Policy configuration
 * @param {import('@playwright/test').Page} page
 * @returns {Object} Result of CSP test
 */
export async function testCSP(page) {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.CI;

  // Get CSP from page
  const csp = await page.evaluate(() => {
    const cspTag = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    return cspTag ? cspTag.content : '';
  });

  // Basic validation (would ideally have more comprehensive checks)
  const result = {
    valid: csp && csp.includes('default-src'),
    message: '',
  };

  if (!result.valid) {
    result.message = 'Invalid or missing Content-Security-Policy';

    // In dev mode, don't fail the test
    if (isDev) {
      console.warn(`[DEV MODE] ${result.message}`);
      result.valid = true;  // Force valid in dev
    }
  }

  return result;
}

/**
 * Check for known vulnerable libraries
 * @param {import('@playwright/test').Page} page
 * @returns {Object} Result of the vulnerability scan
 */
export async function checkForVulnerableLibraries(page) {
  // This would ideally integrate with a real vulnerability database
  // For demo purposes, we just look for outdated libraries by version
  const knownVulnerabilities = [
    { name: 'jquery', version: '<3.5.0', reason: 'XSS vulnerability' },
    { name: 'bootstrap', version: '<4.3.1', reason: 'XSS vulnerability' },
    { name: 'lodash', version: '<4.17.12', reason: 'Prototype pollution' },
  ];

  // Get libraries from the page
  const libraries = await page.evaluate(() => {
    // This is a simplified library detection
    // A real implementation would be more comprehensive
    const detectedLibs = [];

    // Check for jQuery
    if (window.jQuery) {
      detectedLibs.push({ name: 'jquery', version: window.jQuery.fn.jquery });
    }

    // Check for Bootstrap
    if (window.bootstrap) {
      detectedLibs.push({ name: 'bootstrap', version: window.bootstrap.Dropdown.VERSION || 'unknown' });
    }

    // Add other library detections here

    return detectedLibs;
  });

  // Simple version comparison (not for actual use, just for demo)
  function isVulnerable(libVersion, vulnVersion) {
    if (vulnVersion.startsWith('<')) {
      const minVersion = vulnVersion.substring(1);
      return libVersion < minVersion;
    }
    return libVersion === vulnVersion;
  }

  // Check for vulnerabilities
  const vulnerabilities = [];
  for (const lib of libraries) {
    const vulns = knownVulnerabilities.filter((v) => {
      return v.name === lib.name && isVulnerable(lib.version, v.version);
    });

    vulnerabilities.push(...vulns.map((v) => {
      return {
        library: lib.name,
        version: lib.version,
        reason: v.reason,
      };
    }));
  }

  return {
    libraries,
    vulnerabilities,
  };
}

/**
 * Assert security headers
 * @param {import('@playwright/test').Page} page
 * @param {string} testName
 */
export async function assertSecurityHeaders(page, testName) {
  const response = await page.goto(page.url());
  const headers = response.headers();

  const requiredHeaders = [
    'x-frame-options',
    'x-xss-protection',
    'x-content-type-options',
    'referrer-policy',
    'content-security-policy',
    'permissions-policy'
  ];

  const missingHeaders = requiredHeaders.filter(header => !headers[header]);

  if (missingHeaders.length > 0) {
    throw new Error(`Missing security headers: ${missingHeaders.join(', ')}`);
  }

  console.log(`Security headers for ${testName} are present`);
}

/**
 * Assert Content Security Policy (CSP)
 * @param {import('@playwright/test').Page} page
 * @param {string} testName
 */
export async function assertContentSecurityPolicy(page, testName) {
  const response = await page.goto(page.url());
  const headers = response.headers();

  if (!headers['content-security-policy']) {
    throw new Error('Missing Content Security Policy (CSP) header');
  }

  console.log(`Content Security Policy for ${testName} is present`);
}

/**
 * Assert no vulnerable libraries
 * @param {import('@playwright/test').Page} page
 * @param {string} testName
 */
export async function assertNoVulnerableLibraries(page, testName) {
  const response = await page.goto(page.url());
  const body = await response.text();

  const vulnerableLibraries = [
    'jquery',
    'lodash',
    'moment',
    'underscore'
  ];

  const foundLibraries = vulnerableLibraries.filter(lib => body.includes(lib));

  if (foundLibraries.length > 0) {
    throw new Error(`Found vulnerable libraries: ${foundLibraries.join(', ')}`);
  }

  console.log(`No vulnerable libraries found for ${testName}`);
}

/**
 * Run all security tests for a page
 * @param {import('@playwright/test').Page} page
 * @param {string} pageId Page identifier
 */
export async function runSecurityTests(page, pageId) {
  console.log(`🔒 Running security tests for ${pageId}...`);

  try {
    await assertSecurityHeaders(page, pageId);
    await assertContentSecurityPolicy(page, pageId);
    await assertNoVulnerableLibraries(page, pageId);

    console.log(`Security tests for ${pageId} passed`);
  } catch (error) {
    console.error(`Security tests for ${pageId} failed:`, error);
    throw error;
  }
}
