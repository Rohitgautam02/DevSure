/**
 * URL Analyzer
 * Core analysis engine for testing deployment URLs
 * 
 * Performs:
 * - Page reachability check
 * - HTTP status verification
 * - Response time measurement
 * - Basic content validation
 * - Error detection
 */

const axios = require('axios');

// Analysis timeout (30 seconds default)
const TIMEOUT_MS = parseInt(process.env.ANALYSIS_TIMEOUT_MS) || 30000;

/**
 * Main analysis function
 * @param {string} url - The deployment URL to analyze
 * @returns {Object} Analysis result with scores and issues
 */
const analyzeUrl = async (url) => {
  const startTime = Date.now();
  
  // Initialize result structure
  const result = {
    metrics: {
      reachable: false,
      statusCode: null,
      responseTimeMs: null,
      contentType: null,
      contentLength: null,
      hasSSL: url.startsWith('https'),
      serverInfo: null,
      redirects: 0,
      finalUrl: url
    },
    issues: [],
    suggestions: [],
    scores: {
      performance: 100,
      error: 100,
      durability: 100,
      overall: 100
    }
  };

  try {
    // Perform the HTTP request
    const response = await axios.get(url, {
      timeout: TIMEOUT_MS,
      maxRedirects: 5,
      validateStatus: () => true, // Accept all status codes
      headers: {
        'User-Agent': 'DevSure-Analyzer/1.0 (Project Health Check)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    // Calculate response time
    const responseTimeMs = Date.now() - startTime;

    // Update metrics
    result.metrics.reachable = true;
    result.metrics.statusCode = response.status;
    result.metrics.responseTimeMs = responseTimeMs;
    result.metrics.contentType = response.headers['content-type'] || 'unknown';
    result.metrics.contentLength = parseInt(response.headers['content-length']) || null;
    result.metrics.serverInfo = response.headers['server'] || 'Not disclosed';
    result.metrics.finalUrl = response.request?.res?.responseUrl || url;

    // Check for redirects
    if (response.request?._redirectable?._redirectCount) {
      result.metrics.redirects = response.request._redirectable._redirectCount;
    }

    // ============================================
    // ANALYZE STATUS CODE
    // ============================================
    analyzeStatusCode(response.status, result);

    // ============================================
    // ANALYZE RESPONSE TIME
    // ============================================
    analyzeResponseTime(responseTimeMs, result);

    // ============================================
    // ANALYZE CONTENT
    // ============================================
    analyzeContent(response.data, response.headers, result);

    // ============================================
    // ANALYZE SECURITY
    // ============================================
    analyzeSecurity(url, response.headers, result);

    // ============================================
    // ANALYZE HEADERS
    // ============================================
    analyzeHeaders(response.headers, result);

  } catch (error) {
    // Handle request failures
    handleRequestError(error, result);
  }

  // Calculate final scores
  calculateFinalScores(result);

  // Record total analysis time
  result.metrics.analysisTimeMs = Date.now() - startTime;

  return result;
};

/**
 * Analyze HTTP status code
 */
const analyzeStatusCode = (statusCode, result) => {
  if (statusCode >= 500) {
    result.issues.push({
      severity: 'critical',
      category: 'error',
      title: 'Server Error Detected',
      description: `The server returned a ${statusCode} error. This indicates a server-side problem.`,
      impact: 'Users will see an error page instead of your application.'
    });
    result.scores.error -= 40;
    result.suggestions.push({
      priority: 'high',
      title: 'Fix Server Errors',
      description: 'Check your server logs, ensure your application is running, and verify database connections.',
      category: 'error'
    });
  } else if (statusCode >= 400 && statusCode < 500) {
    result.issues.push({
      severity: 'major',
      category: 'error',
      title: 'Client Error Detected',
      description: `The server returned a ${statusCode} error. The requested resource may not exist or be inaccessible.`,
      impact: 'Users may not be able to access your application.'
    });
    result.scores.error -= 30;
    result.suggestions.push({
      priority: 'high',
      title: 'Fix Access Issues',
      description: 'Verify the URL is correct, check authentication settings, and ensure routes are properly configured.',
      category: 'error'
    });
  } else if (statusCode >= 300 && statusCode < 400) {
    result.issues.push({
      severity: 'info',
      category: 'performance',
      title: 'Redirect Detected',
      description: `The URL redirects to another location (status ${statusCode}).`,
      impact: 'Adds slight latency to page load.'
    });
    result.scores.performance -= 5;
  } else if (statusCode === 200 || statusCode === 201) {
    result.suggestions.push({
      priority: 'info',
      title: 'HTTP Status OK',
      description: 'Your application returns a successful response.',
      category: 'success'
    });
  }
};

/**
 * Analyze response time
 */
const analyzeResponseTime = (responseTimeMs, result) => {
  if (responseTimeMs > 5000) {
    result.issues.push({
      severity: 'critical',
      category: 'performance',
      title: 'Extremely Slow Response',
      description: `Response time is ${responseTimeMs}ms (over 5 seconds).`,
      impact: 'Users will likely leave before the page loads. Search engines may penalize slow sites.'
    });
    result.scores.performance -= 30;
    result.suggestions.push({
      priority: 'high',
      title: 'Improve Server Response Time',
      description: 'Consider upgrading hosting, optimizing database queries, implementing caching, or using a CDN.',
      category: 'performance'
    });
  } else if (responseTimeMs > 2000) {
    result.issues.push({
      severity: 'major',
      category: 'performance',
      title: 'Slow Response Time',
      description: `Response time is ${responseTimeMs}ms (over 2 seconds).`,
      impact: 'User experience may suffer. Mobile users especially will notice delays.'
    });
    result.scores.performance -= 15;
    result.suggestions.push({
      priority: 'medium',
      title: 'Optimize Response Time',
      description: 'Target response times under 1 second. Check for slow database queries or API calls.',
      category: 'performance'
    });
  } else if (responseTimeMs > 1000) {
    result.issues.push({
      severity: 'minor',
      category: 'performance',
      title: 'Moderate Response Time',
      description: `Response time is ${responseTimeMs}ms.`,
      impact: 'Acceptable but could be faster.'
    });
    result.scores.performance -= 5;
  }
};

/**
 * Analyze page content
 */
const analyzeContent = (data, headers, result) => {
  const contentType = headers['content-type'] || '';
  
  // Check if it's HTML
  if (contentType.includes('text/html')) {
    const html = String(data);
    
    // Check for common error indicators
    if (html.includes('Internal Server Error') || html.includes('500 Error')) {
      result.issues.push({
        severity: 'critical',
        category: 'error',
        title: 'Error Page Content Detected',
        description: 'The page contains error message content.',
        impact: 'Users are seeing an error page.'
      });
      result.scores.error -= 20;
    }

    // Check for missing title
    if (!html.includes('<title>') || html.includes('<title></title>')) {
      result.issues.push({
        severity: 'minor',
        category: 'seo',
        title: 'Missing Page Title',
        description: 'The page does not have a title tag.',
        impact: 'Bad for SEO and browser tab display.'
      });
      result.suggestions.push({
        priority: 'low',
        title: 'Add Page Title',
        description: 'Add a descriptive <title> tag to improve SEO.',
        category: 'seo'
      });
    }

    // Check for viewport meta (mobile-friendliness)
    if (!html.includes('viewport')) {
      result.issues.push({
        severity: 'minor',
        category: 'accessibility',
        title: 'Missing Viewport Meta Tag',
        description: 'The page may not be mobile-friendly.',
        impact: 'Poor experience on mobile devices.'
      });
      result.scores.durability -= 5;
      result.suggestions.push({
        priority: 'medium',
        title: 'Add Viewport Meta Tag',
        description: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile support.',
        category: 'accessibility'
      });
    }

    // Check for large page size
    const contentLength = parseInt(headers['content-length']) || html.length;
    if (contentLength > 1000000) { // 1MB
      result.issues.push({
        severity: 'major',
        category: 'performance',
        title: 'Large Page Size',
        description: `Page size is ${(contentLength / 1024 / 1024).toFixed(2)}MB.`,
        impact: 'Slow loading, especially on mobile networks.'
      });
      result.scores.performance -= 15;
      result.suggestions.push({
        priority: 'high',
        title: 'Reduce Page Size',
        description: 'Optimize images, minify CSS/JS, and consider lazy loading.',
        category: 'performance'
      });
    }
  }
};

/**
 * Analyze security aspects
 */
const analyzeSecurity = (url, headers, result) => {
  // Check HTTPS
  if (!url.startsWith('https')) {
    result.issues.push({
      severity: 'critical',
      category: 'security',
      title: 'Not Using HTTPS',
      description: 'The site is served over HTTP without encryption.',
      impact: 'Data can be intercepted. Browsers show "Not Secure" warning.'
    });
    result.scores.durability -= 25;
    result.suggestions.push({
      priority: 'critical',
      title: 'Enable HTTPS',
      description: 'Configure SSL/TLS certificate. Most hosting providers offer free SSL via Let\'s Encrypt.',
      category: 'security'
    });
  }

  // Check security headers
  const missingHeaders = [];
  
  if (!headers['x-frame-options'] && !headers['content-security-policy']) {
    missingHeaders.push('X-Frame-Options');
  }
  if (!headers['x-content-type-options']) {
    missingHeaders.push('X-Content-Type-Options');
  }
  if (!headers['strict-transport-security'] && url.startsWith('https')) {
    missingHeaders.push('Strict-Transport-Security');
  }

  if (missingHeaders.length > 0) {
    result.issues.push({
      severity: 'minor',
      category: 'security',
      title: 'Missing Security Headers',
      description: `Missing headers: ${missingHeaders.join(', ')}`,
      impact: 'Reduced protection against certain attacks.'
    });
    result.scores.durability -= 5;
    result.suggestions.push({
      priority: 'medium',
      title: 'Add Security Headers',
      description: 'Configure your server to send security headers to protect against XSS, clickjacking, etc.',
      category: 'security'
    });
  }
};

/**
 * Analyze HTTP headers
 */
const analyzeHeaders = (headers, result) => {
  // Check for caching headers
  if (!headers['cache-control'] && !headers['etag'] && !headers['last-modified']) {
    result.issues.push({
      severity: 'minor',
      category: 'performance',
      title: 'No Caching Headers',
      description: 'The server does not specify caching behavior.',
      impact: 'Browsers will re-download resources on every visit.'
    });
    result.scores.performance -= 5;
    result.suggestions.push({
      priority: 'medium',
      title: 'Configure Caching',
      description: 'Add Cache-Control headers to improve repeat visit performance.',
      category: 'performance'
    });
  }

  // Check for compression
  const encoding = headers['content-encoding'];
  if (!encoding || (!encoding.includes('gzip') && !encoding.includes('br'))) {
    result.issues.push({
      severity: 'minor',
      category: 'performance',
      title: 'No Compression',
      description: 'Response is not compressed.',
      impact: 'Larger download size, slower loading.'
    });
    result.scores.performance -= 5;
    result.suggestions.push({
      priority: 'low',
      title: 'Enable Compression',
      description: 'Enable gzip or brotli compression on your server.',
      category: 'performance'
    });
  }
};

/**
 * Handle request errors
 */
const handleRequestError = (error, result) => {
  result.metrics.reachable = false;

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    result.issues.push({
      severity: 'critical',
      category: 'error',
      title: 'Request Timeout',
      description: `The server did not respond within ${TIMEOUT_MS / 1000} seconds.`,
      impact: 'Users cannot access your application.'
    });
    result.scores.error -= 50;
    result.scores.performance -= 30;
  } else if (error.code === 'ENOTFOUND') {
    result.issues.push({
      severity: 'critical',
      category: 'error',
      title: 'Domain Not Found',
      description: 'The domain does not exist or DNS is not configured.',
      impact: 'Application is completely inaccessible.'
    });
    result.scores.error -= 50;
  } else if (error.code === 'ECONNREFUSED') {
    result.issues.push({
      severity: 'critical',
      category: 'error',
      title: 'Connection Refused',
      description: 'The server is not accepting connections.',
      impact: 'Application is down or misconfigured.'
    });
    result.scores.error -= 50;
  } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    result.issues.push({
      severity: 'critical',
      category: 'security',
      title: 'SSL Certificate Error',
      description: 'The SSL certificate is invalid, expired, or misconfigured.',
      impact: 'Browsers will block access with security warning.'
    });
    result.scores.durability -= 40;
    result.scores.error -= 20;
  } else {
    result.issues.push({
      severity: 'critical',
      category: 'error',
      title: 'Connection Failed',
      description: `Could not connect: ${error.message}`,
      impact: 'Application may be inaccessible.'
    });
    result.scores.error -= 50;
  }

  result.suggestions.push({
    priority: 'critical',
    title: 'Ensure Application is Running',
    description: 'Verify your deployment is active, check hosting provider status, and confirm the URL is correct.',
    category: 'error'
  });
};

/**
 * Calculate final scores
 */
const calculateFinalScores = (result) => {
  // Ensure scores don't go below 0
  result.scores.performance = Math.max(0, result.scores.performance);
  result.scores.error = Math.max(0, result.scores.error);
  result.scores.durability = Math.max(0, result.scores.durability);

  // Calculate overall score (weighted average)
  result.scores.overall = Math.round(
    (result.scores.performance * 0.3) +
    (result.scores.error * 0.4) +
    (result.scores.durability * 0.3)
  );

  // Ensure overall is within bounds
  result.scores.overall = Math.max(0, Math.min(100, result.scores.overall));
};

module.exports = {
  analyzeUrl
};
