/**
 * Security testing utilities
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

/**
 * Check security headers
 * @param {Object} headers Response headers
 * @returns {Object} Check results
 */
export async function checkHeaders(headers = {}) {
  const results = {
    pass: true,
    details: [],
    message: 'All security headers pass'
  };

  // Convert header names to lowercase for case-insensitive comparison
  const normalizedHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    normalizedHeaders[key.toLowerCase()] = value;
  }

  // Define required headers and their requirements
  const requiredHeaders = [
    {
      name: 'content-security-policy',
      required: false,
      validator: (value) => {return value.includes('default-src')},
      message: 'Content-Security-Policy should define default-src directive'
    },
    {
      name: 'x-content-type-options',
      required: true,
      validator: (value) => {return value === 'nosniff'},
      message: 'X-Content-Type-Options should be set to nosniff'
    },
    {
      name: 'x-frame-options',
      required: false,
      validator: (value) => {return ['DENY', 'SAMEORIGIN'].includes(value.toUpperCase())},
      message: 'X-Frame-Options should be set to DENY or SAMEORIGIN'
    },
    {
      name: 'strict-transport-security',
      required: false,
      validator: (value) => {return value.includes('max-age=')},
      message: 'Strict-Transport-Security should define max-age'
    }
  ];

  // Check each header
  for (const header of requiredHeaders) {
    const value = normalizedHeaders[header.name];

    if (!value && header.required) {
      results.pass = false;
      results.details.push({
        header: header.name,
        found: false,
        message: `Required header "${header.name}" is missing`
      });
    } else if (value && !header.validator(value)) {
      results.pass = false;
      results.details.push({
        header: header.name,
        found: true,
        value,
        message: header.message
      });
    } else if (value) {
      results.details.push({
        header: header.name,
        found: true,
        value,
        pass: true
      });
    }
  }

  // Set overall message
  if (!results.pass) {
    results.message = `${results.details.filter(d => {return !d.pass}).length} security headers failed checks`;
  }

  return results;
}

/**
 * Test Content Security Policy
 * @param {Page} page Playwright page object
 * @returns {Object} Test results
 */
export async function testCSP(page) {
  try {
    // Get CSP from meta tag if exists
    const cspMeta = await page.$('meta[http-equiv="Content-Security-Policy"]');
    const cspFromMeta = cspMeta ? await cspMeta.getAttribute('content') : null;

    // Get CSP from headers (needs to have been captured during navigation)
    const cspFromHeaders = await page.evaluate(() => {
      return performance.getEntriesByType('navigation')[0]?.securityPolicyViolationEvents || [];
    });

    // If no CSP found through either method
    if (!cspFromMeta && (!cspFromHeaders || cspFromHeaders.length === 0)) {
      return {
        valid: false,
        message: 'No Content Security Policy found'
      };
    }

    // Simple validation that some key directives exist
    const csp = cspFromMeta || '';
    const hasDefaultSrc = csp.includes('default-src');
    const hasScriptSrc = csp.includes('script-src');
    const hasStyleSrc = csp.includes('style-src');

    if (!hasDefaultSrc) {
      return {
        valid: false,
        message: 'CSP is missing default-src directive'
      };
    }

    return {
      valid: true,
      message: 'CSP appears to be properly configured',
      details: {
        source: cspFromMeta ? 'meta-tag' : 'headers',
        hasDefaultSrc,
        hasScriptSrc,
        hasStyleSrc
      }
    };
  } catch (error) {
    return {
      valid: false,
      message: `Error testing CSP: ${error.message}`
    };
  }
}

/**
 * Check for vulnerable libraries
 * @param {Page} page Playwright page object
 * @returns {Object} Check results
 */
export async function checkForVulnerableLibraries(page) {
  // This is a simplified implementation
  // In a real implementation, you would collect all loaded scripts and compare versions
  // against a vulnerability database like Snyk or npm audit

  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script[src]'))
      .map(script => {
        return {
          src: script.src,
          url: new URL(script.src, window.location.href).href
        };
      });
  });

  // For demo purposes, let's pretend we found vulnerabilities in certain patterns
  const vulnerabilityPatterns = [
    { pattern: 'jquery-1.', version: '1.x', severity: 'high' },
    { pattern: 'angular-1.0.', version: '1.0.x', severity: 'high' },
    { pattern: 'bootstrap-2.', version: '2.x', severity: 'medium' }
  ];

  const vulnerabilities = [];

  scripts.forEach(script => {
    vulnerabilityPatterns.forEach(vuln => {
      if (script.src.includes(vuln.pattern)) {
        vulnerabilities.push({
          library: script.src.split('/').pop(),
          version: vuln.version,
          severity: vuln.severity,
          url: script.url
        });
      }
    });
  });

  return {
    scannedScripts: scripts.length,
    vulnerabilities
  };
}

/**
 * Run all security tests for a page
 * @param {Page} page Playwright page object
 * @param {string} pageId Page identifier
 */
export async function runSecurityTests(page, pageId) {
  console.log(`🔒 Running security tests for ${pageId}...`);

  try {
    // Get response headers
    const response = await page.request.get(page.url());
    const headers = response.headers();

    // Check security headers
    const headerChecks = await checkHeaders(headers);

    // Check CSP
    const cspResult = await testCSP(page);

    // Check for vulnerable libraries
    const vulnResult = await checkForVulnerableLibraries(page);

    // Save results to file
    const securityDir = path.join(rootDir, 'reports', 'security');

    try {
      // Create directory if it doesn't exist
      if (!fs.existsSync(securityDir)) {
        fs.mkdirSync(securityDir, { recursive: true });
      }

      // Save report
      const reportPath = path.join(securityDir, `${pageId}-security.json`);
      fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        headerChecks,
        cspResult,
        vulnerableLibraries: vulnResult
      }, null, 2));

    } catch (error) {
      console.error('Error saving security report:', error);
    }

    // Log results
    if (!headerChecks.pass) {
      console.warn(`⚠️ Security header issues found for ${pageId}:`);
      headerChecks.details.filter(d => {return !d.pass}).forEach(issue => {
        console.warn(`  - ${issue.message}`);
      });
    } else {
      console.log(`✅ Security headers verified for ${pageId}`);
    }

    if (!cspResult.valid) {
      console.warn(`⚠️ CSP issues found for ${pageId}: ${cspResult.message}`);
    } else {
      console.log(`✅ CSP validated for ${pageId}`);
    }

    if (vulnResult.vulnerabilities.length > 0) {
      console.warn(`⚠️ ${vulnResult.vulnerabilities.length} vulnerable libraries found for ${pageId}:`);
      vulnResult.vulnerabilities.forEach((vuln, i) => {
        console.warn(`  ${i+1}. ${vuln.library} (${vuln.version}): ${vuln.severity} severity`);
      });
    } else {
      console.log(`✅ No vulnerable libraries found for ${pageId}`);
    }

    return {
      headerChecks,
      cspResult,
      vulnResult
    };

  } catch (error) {
    console.error('Error running security tests:', error);
    return { error: error.message };
  }
}
