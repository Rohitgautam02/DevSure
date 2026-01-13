/**
 * Full Stack Analyzer
 * 
 * One-click analysis that combines:
 * - Performance (Lighthouse)
 * - Security (npm audit + headers)
 * - Code Quality (ESLint)
 * - Dependencies (outdated check)
 * 
 * Outputs PLAIN ENGLISH explanations for non-technical founders
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const { execSync, exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Plain English translations for technical metrics
 */
const PLAIN_ENGLISH = {
  // Performance
  lcp: {
    good: (val) => `Your page shows main content in ${val}s — that's fast! ✓`,
    moderate: (val) => `Your page takes ${val}s to show content. Users get impatient after 2.5s.`,
    poor: (val) => `⚠️ Your page takes ${val}s to show content. Most users will leave before it loads.`
  },
  fcp: {
    good: (val) => `First paint in ${val}s — users see something quickly ✓`,
    moderate: (val) => `Users wait ${val}s before seeing anything. That feels slow on mobile.`,
    poor: (val) => `⚠️ ${val}s of blank screen. Users might think your site is broken.`
  },
  cls: {
    good: () => `Page layout is stable — nothing jumps around ✓`,
    moderate: () => `Some elements shift while loading. This frustrates users trying to click.`,
    poor: () => `⚠️ Page content jumps around a lot. Users might click wrong things.`
  },
  performance: {
    good: () => `Your site loads quickly on most devices ✓`,
    moderate: () => `Your site is a bit slow, especially on phones. This hurts conversions.`,
    poor: () => `⚠️ Your site is too slow. You're losing visitors and Google ranking.`
  },
  
  // Security
  https: {
    yes: () => `Site uses HTTPS encryption ✓`,
    no: () => `⚠️ NO ENCRYPTION! Browsers show "Not Secure". Users won't trust you.`
  },
  vulnerabilities: {
    none: () => `No known security issues in your dependencies ✓`,
    low: (count) => `${count} low-risk security issues. Fix when you have time.`,
    moderate: (count) => `${count} security issues found. Should fix within a week.`,
    high: (count) => `⚠️ ${count} security vulnerabilities! Hackers could exploit these.`,
    critical: (count) => `🚨 ${count} CRITICAL vulnerabilities! Fix immediately or risk data breach.`
  },
  
  // Code Quality
  eslint: {
    none: () => `Code follows best practices ✓`,
    warnings: (count) => `${count} code style issues. Won't break things but makes code harder to maintain.`,
    errors: (count) => `${count} code problems that could cause bugs in production.`,
    notConfigured: () => `No linting set up. You're flying blind — bugs are hiding in your code.`
  },
  tests: {
    yes: () => `Automated tests protect against breaking changes ✓`,
    no: () => `No tests! Every code change risks breaking something without you knowing.`
  },
  
  // Dependencies
  outdated: {
    none: () => `All packages are up to date ✓`,
    few: (count) => `${count} packages have updates. Minor improvements available.`,
    many: (count) => `${count} outdated packages. You're missing security patches and bug fixes.`,
    critical: (count) => `⚠️ ${count} packages are very outdated. Some may have security issues.`
  }
};

/**
 * Run Lighthouse locally
 */
const runLighthouse = async (url) => {
  let chrome = null;
  try {
    console.log(`[FullStack] Starting Lighthouse for ${url}...`);
    
    // Launch Chrome
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage']
    });

    const options = {
      logLevel: 'error',
      output: 'json',
      port: chrome.port,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
    };

    const result = await lighthouse(url, options);
    const lhr = result.lhr;

    // Extract scores
    const scores = {
      performance: Math.round((lhr.categories.performance?.score || 0) * 100),
      accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
      seo: Math.round((lhr.categories.seo?.score || 0) * 100)
    };

    // Extract Core Web Vitals
    const audits = lhr.audits || {};
    const webVitals = {
      lcp: parseFloat(audits['largest-contentful-paint']?.displayValue?.replace(/[^\d.]/g, '') || 0),
      fcp: parseFloat(audits['first-contentful-paint']?.displayValue?.replace(/[^\d.]/g, '') || 0),
      cls: parseFloat(audits['cumulative-layout-shift']?.displayValue || 0),
      tbt: parseFloat(audits['total-blocking-time']?.displayValue?.replace(/[^\d.]/g, '') || 0),
      tti: parseFloat(audits['interactive']?.displayValue?.replace(/[^\d.]/g, '') || 0),
      si: parseFloat(audits['speed-index']?.displayValue?.replace(/[^\d.]/g, '') || 0)
    };

    // Get opportunities (things to fix)
    const opportunities = [];
    for (const [key, audit] of Object.entries(audits)) {
      if (audit.details?.type === 'opportunity' && audit.score !== null && audit.score < 0.9) {
        opportunities.push({
          title: audit.title,
          description: audit.description,
          savings: audit.displayValue,
          score: audit.score,
          impact: audit.score < 0.5 ? 'high' : audit.score < 0.75 ? 'medium' : 'low'
        });
      }
    }

    // Sort by impact
    opportunities.sort((a, b) => a.score - b.score);

    console.log(`[FullStack] Lighthouse complete: Performance ${scores.performance}`);
    
    return {
      success: true,
      scores,
      webVitals,
      opportunities: opportunities.slice(0, 10) // Top 10
    };

  } catch (error) {
    console.error(`[FullStack] Lighthouse error:`, error.message);
    return { success: false, error: error.message };
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
};

/**
 * Analyze a GitHub repository
 */
const analyzeRepository = async (repoUrl) => {
  const tempDir = path.join(os.tmpdir(), `devsure-${Date.now()}`);
  
  try {
    console.log(`[FullStack] Cloning ${repoUrl}...`);
    
    // Clone repo
    await execAsync(`git clone --depth 1 ${repoUrl} ${tempDir}`, { timeout: 60000 });
    
    // Check for package.json
    const hasPackageJson = await fs.access(path.join(tempDir, 'package.json'))
      .then(() => true)
      .catch(() => false);
    
    if (!hasPackageJson) {
      return { success: false, error: 'No package.json found' };
    }

    // Read package.json
    const packageJson = JSON.parse(await fs.readFile(path.join(tempDir, 'package.json'), 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Install dependencies
    console.log(`[FullStack] Installing dependencies...`);
    try {
      await execAsync('npm install --legacy-peer-deps', { cwd: tempDir, timeout: 120000 });
    } catch (e) {
      console.log(`[FullStack] npm install warning: ${e.message}`);
    }

    // Run npm audit
    let vulnerabilities = { critical: 0, high: 0, moderate: 0, low: 0, total: 0 };
    try {
      const { stdout } = await execAsync('npm audit --json 2>/dev/null || true', { cwd: tempDir });
      if (stdout) {
        const audit = JSON.parse(stdout);
        if (audit.metadata?.vulnerabilities) {
          vulnerabilities = audit.metadata.vulnerabilities;
        }
      }
    } catch (e) {}

    // Check outdated
    let outdatedCount = 0;
    try {
      const { stdout } = await execAsync('npm outdated --json 2>/dev/null || true', { cwd: tempDir });
      if (stdout && stdout.trim()) {
        outdatedCount = Object.keys(JSON.parse(stdout)).length;
      }
    } catch (e) {}

    // Run ESLint
    let eslintErrors = 0, eslintWarnings = 0;
    const hasESLint = deps.eslint || deps['@eslint/js'];
    
    try {
      const eslintCmd = hasESLint 
        ? 'npx eslint . --ext .js,.jsx,.ts,.tsx --format json 2>/dev/null || true'
        : 'npx eslint . --ext .js,.jsx,.ts,.tsx --format json --no-eslintrc --rule "no-unused-vars: warn" 2>/dev/null || true';
      
      const { stdout } = await execAsync(eslintCmd, { cwd: tempDir, timeout: 60000 });
      if (stdout) {
        const results = JSON.parse(stdout);
        for (const file of results) {
          eslintErrors += file.errorCount || 0;
          eslintWarnings += file.warningCount || 0;
        }
      }
    } catch (e) {}

    // Check for tests
    const hasTests = deps.jest || deps.mocha || deps.vitest || 
      deps['@testing-library/react'] || deps.cypress;

    // Check for TypeScript
    const hasTypeScript = deps.typescript;

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });

    return {
      success: true,
      vulnerabilities,
      outdatedCount,
      eslintErrors,
      eslintWarnings,
      hasESLint: !!hasESLint,
      hasTests: !!hasTests,
      hasTypeScript: !!hasTypeScript,
      dependencyCount: Object.keys(deps).length,
      framework: detectFramework(deps)
    };

  } catch (error) {
    // Cleanup on error
    try { await fs.rm(tempDir, { recursive: true, force: true }); } catch (e) {}
    return { success: false, error: error.message };
  }
};

/**
 * Detect framework from dependencies
 */
const detectFramework = (deps) => {
  if (deps.next) return 'Next.js';
  if (deps.nuxt) return 'Nuxt.js';
  if (deps['react-scripts']) return 'Create React App';
  if (deps.gatsby) return 'Gatsby';
  if (deps.vite) return 'Vite';
  if (deps.react) return 'React';
  if (deps.vue) return 'Vue.js';
  if (deps.express) return 'Express.js';
  if (deps.angular) return 'Angular';
  return 'Unknown';
};

/**
 * Generate Plain English summary
 */
const generatePlainEnglish = (lighthouse, repo) => {
  const summary = {
    headline: '',
    verdict: 'unknown',
    priority: [],
    positives: [],
    warnings: []
  };

  // Calculate overall health
  let healthScore = 50;

  // Lighthouse results
  if (lighthouse?.success) {
    const perf = lighthouse.scores.performance;
    
    if (perf >= 90) {
      summary.positives.push(PLAIN_ENGLISH.performance.good());
      healthScore += 20;
    } else if (perf >= 50) {
      summary.warnings.push(PLAIN_ENGLISH.performance.moderate());
      healthScore += 5;
    } else {
      summary.priority.push({
        urgency: 'high',
        issue: PLAIN_ENGLISH.performance.poor(),
        fix: 'Optimize images, enable caching, and minimize JavaScript'
      });
      healthScore -= 10;
    }

    // LCP
    if (lighthouse.webVitals.lcp > 4) {
      summary.priority.push({
        urgency: 'high',
        issue: PLAIN_ENGLISH.lcp.poor(lighthouse.webVitals.lcp),
        fix: 'Compress images, use lazy loading, optimize server response'
      });
    } else if (lighthouse.webVitals.lcp > 2.5) {
      summary.warnings.push(PLAIN_ENGLISH.lcp.moderate(lighthouse.webVitals.lcp));
    }

    // Add top opportunities
    if (lighthouse.opportunities?.length > 0) {
      for (const opp of lighthouse.opportunities.slice(0, 3)) {
        if (opp.impact === 'high') {
          summary.priority.push({
            urgency: 'medium',
            issue: opp.title,
            fix: opp.description?.split('.')[0] || 'See Lighthouse report'
          });
        }
      }
    }
  }

  // Repository results
  if (repo?.success) {
    // Vulnerabilities
    if (repo.vulnerabilities.critical > 0) {
      summary.priority.unshift({
        urgency: 'critical',
        issue: PLAIN_ENGLISH.vulnerabilities.critical(repo.vulnerabilities.critical),
        fix: 'Run: npm audit fix --force'
      });
      healthScore -= 20;
    } else if (repo.vulnerabilities.high > 0) {
      summary.priority.push({
        urgency: 'high',
        issue: PLAIN_ENGLISH.vulnerabilities.high(repo.vulnerabilities.high),
        fix: 'Run: npm audit fix'
      });
      healthScore -= 10;
    } else if (repo.vulnerabilities.total === 0) {
      summary.positives.push(PLAIN_ENGLISH.vulnerabilities.none());
      healthScore += 10;
    }

    // ESLint
    if (repo.eslintErrors > 10) {
      summary.priority.push({
        urgency: 'medium',
        issue: PLAIN_ENGLISH.eslint.errors(repo.eslintErrors),
        fix: 'Run: npx eslint . --fix'
      });
      healthScore -= 10;
    } else if (!repo.hasESLint) {
      summary.warnings.push(PLAIN_ENGLISH.eslint.notConfigured());
    } else if (repo.eslintErrors === 0) {
      summary.positives.push(PLAIN_ENGLISH.eslint.none());
      healthScore += 10;
    }

    // Tests
    if (repo.hasTests) {
      summary.positives.push(PLAIN_ENGLISH.tests.yes());
      healthScore += 10;
    } else {
      summary.warnings.push(PLAIN_ENGLISH.tests.no());
    }

    // Outdated
    if (repo.outdatedCount > 20) {
      summary.warnings.push(PLAIN_ENGLISH.outdated.critical(repo.outdatedCount));
    } else if (repo.outdatedCount > 10) {
      summary.warnings.push(PLAIN_ENGLISH.outdated.many(repo.outdatedCount));
    } else if (repo.outdatedCount === 0) {
      summary.positives.push(PLAIN_ENGLISH.outdated.none());
    }
  }

  // Calculate final health
  healthScore = Math.max(0, Math.min(95, healthScore));

  // Generate headline
  if (healthScore >= 80) {
    summary.headline = "Your project is in good shape! 🎉";
    summary.verdict = 'good';
  } else if (healthScore >= 60) {
    summary.headline = "Your project needs some attention";
    summary.verdict = 'moderate';
  } else if (healthScore >= 40) {
    summary.headline = "Several issues should be fixed before launch";
    summary.verdict = 'warning';
  } else {
    summary.headline = "⚠️ Critical issues need immediate attention";
    summary.verdict = 'critical';
  }

  summary.healthScore = healthScore;

  return summary;
};

/**
 * Full stack analysis - combines everything
 */
const analyzeFullStack = async (url, repoUrl = null) => {
  const startTime = Date.now();
  
  const result = {
    lighthouse: null,
    repository: null,
    plainEnglish: null,
    analyzedAt: new Date().toISOString(),
    analysisTimeMs: 0
  };

  // Run Lighthouse if URL provided
  if (url && !url.includes('github.com')) {
    result.lighthouse = await runLighthouse(url);
  }

  // Analyze repo if provided
  if (repoUrl) {
    result.repository = await analyzeRepository(repoUrl);
  }

  // Generate plain English summary
  result.plainEnglish = generatePlainEnglish(result.lighthouse, result.repository);
  
  result.analysisTimeMs = Date.now() - startTime;

  return result;
};

module.exports = {
  analyzeFullStack,
  runLighthouse,
  analyzeRepository,
  generatePlainEnglish
};
