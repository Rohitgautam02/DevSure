/**
 * Lighthouse Analyzer via PageSpeed Insights API
 * 
 * Uses Google's free PageSpeed Insights API to get:
 * - Performance Score
 * - Accessibility Score
 * - SEO Score
 * - Best Practices Score
 * - Core Web Vitals (LCP, FID, CLS, FCP, TTFB)
 * 
 * API Limit: 25,000 requests/day (free, no key required for basic usage)
 */

const axios = require('axios');

const PAGESPEED_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

// Optional: Add your API key for higher limits (get free key at https://console.cloud.google.com/)
// Without API key: ~60 requests/day per IP
// With API key: 25,000 requests/day
const API_KEY = process.env.PAGESPEED_API_KEY || '';

/**
 * Run Lighthouse analysis via PageSpeed Insights API
 * @param {string} url - URL to analyze
 * @param {string} strategy - 'mobile' or 'desktop'
 * @returns {Object} Lighthouse results
 */
const analyzeLighthouse = async (url, strategy = 'mobile') => {
  const result = {
    success: false,
    strategy,
    scores: {
      performance: null,
      accessibility: null,
      bestPractices: null,
      seo: null
    },
    coreWebVitals: {
      lcp: null,
      fcp: null,
      cls: null,
      tbt: null,
      si: null,
      tti: null
    },
    audits: [],
    opportunities: [],
    diagnostics: [],
    error: null
  };

  try {
    console.log(`[Lighthouse] Analyzing: ${url} (${strategy})`);
    
    // Build API URL with multiple categories
    let apiUrl = `${PAGESPEED_API_URL}?url=${encodeURIComponent(url)}&strategy=${strategy}`;
    apiUrl += '&category=performance&category=accessibility&category=best-practices&category=seo';
    
    if (API_KEY) {
      apiUrl += `&key=${API_KEY}`;
      console.log(`[Lighthouse] Using API key for higher rate limits`);
    } else {
      console.log(`[Lighthouse] No API key - limited to ~60 requests/day per IP`);
    }

    // Make API request (this can take 20-60 seconds)
    const response = await axios.get(apiUrl, {
      timeout: 120000, // 2 minute timeout
      headers: {
        'Accept': 'application/json'
      }
    });

    const data = response.data;
    
    if (!data.lighthouseResult) {
      throw new Error('No Lighthouse result in response');
    }

    const lighthouse = data.lighthouseResult;
    
    // Extract category scores (convert from 0-1 to 0-100)
    result.scores = {
      performance: Math.round((lighthouse.categories?.performance?.score || 0) * 100),
      accessibility: Math.round((lighthouse.categories?.accessibility?.score || 0) * 100),
      bestPractices: Math.round((lighthouse.categories?.['best-practices']?.score || 0) * 100),
      seo: Math.round((lighthouse.categories?.seo?.score || 0) * 100)
    };

    // Extract Core Web Vitals from audits
    const audits = lighthouse.audits || {};
    
    result.coreWebVitals = {
      // Largest Contentful Paint (in seconds)
      lcp: audits['largest-contentful-paint']?.numericValue 
        ? (audits['largest-contentful-paint'].numericValue / 1000).toFixed(2)
        : null,
      
      // First Contentful Paint (in seconds)
      fcp: audits['first-contentful-paint']?.numericValue
        ? (audits['first-contentful-paint'].numericValue / 1000).toFixed(2)
        : null,
      
      // Cumulative Layout Shift
      cls: audits['cumulative-layout-shift']?.numericValue?.toFixed(3) || null,
      
      // Total Blocking Time (in ms)
      tbt: audits['total-blocking-time']?.numericValue
        ? Math.round(audits['total-blocking-time'].numericValue)
        : null,
      
      // Speed Index (in seconds)
      si: audits['speed-index']?.numericValue
        ? (audits['speed-index'].numericValue / 1000).toFixed(2)
        : null,
      
      // Time to Interactive (in seconds)
      tti: audits['interactive']?.numericValue
        ? (audits['interactive'].numericValue / 1000).toFixed(2)
        : null
    };

    // Extract key opportunities for improvement
    result.opportunities = extractOpportunities(audits);
    
    // Extract diagnostics
    result.diagnostics = extractDiagnostics(audits);

    // Extract failed audits
    result.audits = extractFailedAudits(lighthouse);

    result.success = true;
    console.log(`[Lighthouse] ✅ Completed: Performance ${result.scores.performance}/100`);

  } catch (error) {
    console.error(`[Lighthouse] ❌ Error:`, error.message);
    result.error = error.message;
    
    // Handle specific errors
    if (error.response?.status === 429) {
      result.error = 'Rate limit exceeded. Please try again later.';
    } else if (error.response?.status === 400) {
      result.error = 'Invalid URL or URL not accessible from Google servers.';
    } else if (error.code === 'ECONNABORTED') {
      result.error = 'Analysis timed out. The page may be too slow or unresponsive.';
    }
  }

  return result;
};

/**
 * Extract performance opportunities from audits
 */
const extractOpportunities = (audits) => {
  const opportunities = [];
  
  const opportunityAudits = [
    'render-blocking-resources',
    'unused-css-rules',
    'unused-javascript',
    'modern-image-formats',
    'uses-optimized-images',
    'uses-text-compression',
    'uses-responsive-images',
    'efficient-animated-content',
    'duplicated-javascript',
    'legacy-javascript',
    'preload-lcp-image',
    'unminified-css',
    'unminified-javascript'
  ];

  for (const auditId of opportunityAudits) {
    const audit = audits[auditId];
    if (audit && audit.score !== null && audit.score < 1) {
      opportunities.push({
        id: auditId,
        title: audit.title,
        description: audit.description,
        score: Math.round(audit.score * 100),
        savings: audit.details?.overallSavingsMs 
          ? `${Math.round(audit.details.overallSavingsMs)}ms potential savings`
          : null,
        displayValue: audit.displayValue || null
      });
    }
  }

  // Sort by potential impact
  return opportunities.sort((a, b) => a.score - b.score).slice(0, 10);
};

/**
 * Extract diagnostics from audits
 */
const extractDiagnostics = (audits) => {
  const diagnostics = [];
  
  const diagnosticAudits = [
    'dom-size',
    'critical-request-chains',
    'network-requests',
    'network-rtt',
    'network-server-latency',
    'main-thread-tasks',
    'bootup-time',
    'mainthread-work-breakdown',
    'font-display',
    'third-party-summary'
  ];

  for (const auditId of diagnosticAudits) {
    const audit = audits[auditId];
    if (audit && audit.score !== null && audit.score < 1) {
      diagnostics.push({
        id: auditId,
        title: audit.title,
        description: audit.description,
        displayValue: audit.displayValue || null
      });
    }
  }

  return diagnostics.slice(0, 8);
};

/**
 * Extract failed audits across all categories
 */
const extractFailedAudits = (lighthouse) => {
  const failed = [];
  const audits = lighthouse.audits || {};
  
  // Important audits to check
  const importantAudits = [
    // Accessibility
    'color-contrast',
    'image-alt',
    'label',
    'button-name',
    'link-name',
    'html-has-lang',
    'meta-viewport',
    
    // SEO
    'meta-description',
    'document-title',
    'crawlable-anchors',
    'robots-txt',
    'canonical',
    
    // Best Practices
    'is-on-https',
    'geolocation-on-start',
    'notification-on-start',
    'no-vulnerable-libraries',
    'errors-in-console'
  ];

  for (const auditId of importantAudits) {
    const audit = audits[auditId];
    if (audit && audit.score === 0) {
      failed.push({
        id: auditId,
        title: audit.title,
        description: audit.description,
        category: getCategoryForAudit(auditId)
      });
    }
  }

  return failed;
};

/**
 * Get category for audit ID
 */
const getCategoryForAudit = (auditId) => {
  const accessibilityAudits = ['color-contrast', 'image-alt', 'label', 'button-name', 'link-name', 'html-has-lang', 'meta-viewport'];
  const seoAudits = ['meta-description', 'document-title', 'crawlable-anchors', 'robots-txt', 'canonical'];
  
  if (accessibilityAudits.includes(auditId)) return 'accessibility';
  if (seoAudits.includes(auditId)) return 'seo';
  return 'best-practices';
};

/**
 * Run analysis for both mobile and desktop
 */
const analyzeFullLighthouse = async (url) => {
  console.log(`[Lighthouse] Starting full analysis for: ${url}`);
  
  // Run mobile analysis (primary - this is what Google uses for ranking)
  const mobile = await analyzeLighthouse(url, 'mobile');
  
  // Optionally run desktop too (comment out to save API calls)
  // const desktop = await analyzeLighthouse(url, 'desktop');
  
  return {
    mobile,
    // desktop,  // Uncomment if needed
    analyzedAt: new Date().toISOString()
  };
};

module.exports = {
  analyzeLighthouse,
  analyzeFullLighthouse
};
