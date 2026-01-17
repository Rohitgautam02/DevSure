/**
 * Job Runner Service
 * Polls the database for pending analysis jobs
 * Lightweight alternative to Redis for low-resource systems
 * 
 * Supports:
 * - Deployment URL analysis (HTTP + Lighthouse)
 * - GitHub repository analysis (security, code quality)
 */

const prisma = require('../config/prisma');
const { analyzeUrl } = require('../analyzers/urlAnalyzer');
const { analyzeFullLighthouse } = require('../analyzers/lighthouseAnalyzer');
const { analyzeGitHubRepo, isGitHubRepo } = require('../analyzers/githubAnalyzer');

// Configuration
const POLL_INTERVAL_MS = parseInt(process.env.ANALYSIS_POLL_INTERVAL_MS) || 10000;
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_ANALYSES) || 1;
const ENABLE_LIGHTHOUSE = process.env.ENABLE_LIGHTHOUSE !== 'false'; // Enabled by default

let isRunning = false;
let pollTimer = null;
let currentJobs = 0;

/**
 * Start the job runner
 */
const start = () => {
  if (isRunning) {
    console.log('[JobRunner] Already running');
    return;
  }

  isRunning = true;
  console.log(`[JobRunner] Starting... (polling every ${POLL_INTERVAL_MS / 1000}s)`);
  
  // Start polling immediately
  poll();
  
  // Set up interval
  pollTimer = setInterval(poll, POLL_INTERVAL_MS);
};

/**
 * Stop the job runner
 */
const stop = () => {
  if (!isRunning) return;

  isRunning = false;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  console.log('[JobRunner] Stopped');
};

/**
 * Poll for pending jobs
 */
const poll = async () => {
  if (!isRunning) return;
  if (currentJobs >= MAX_CONCURRENT) {
    console.log('[JobRunner] Max concurrent jobs reached, skipping poll');
    return;
  }

  try {
    // Find one pending project
    const project = await prisma.project.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' }
    });

    if (!project) {
      // No pending jobs
      return;
    }

    console.log(`[JobRunner] Found pending project: ${project.id}`);
    
    // Process the job
    await processJob(project);

  } catch (error) {
    console.error('[JobRunner] Poll error:', error.message);
  }
};

/**
 * Process a single analysis job
 */
const processJob = async (project) => {
  currentJobs++;
  const startTime = Date.now();

  try {
    // Update status to ANALYZING
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'ANALYZING' }
    });

    const url = project.inputUrl;
    const isGithub = isGitHubRepo(url);
    
    console.log(`[JobRunner] Analyzing (${isGithub ? 'GitHub' : 'Deployment'}): ${url}`);

    let resultData = {
      projectId: project.id,
      analysisTimeMs: 0,
      // Default scores
      overallScore: 0,
      performanceScore: 100,
      errorScore: 100,
      durabilityScore: 100,
      // Lighthouse scores (null if not run)
      lighthousePerformance: null,
      lighthouseAccessibility: null,
      lighthouseBestPractices: null,
      lighthouseSeo: null,
      // JSON fields
      coreWebVitals: '{}',
      lighthouseDetails: '{}',
      githubAnalysis: '{}',
      issues: '[]',
      suggestions: '[]',
      metrics: '{}',
      // New scores
      codeQualityScore: null,
      securityScore: null
    };

    if (isGithub) {
      // ============================================
      // GITHUB REPOSITORY ANALYSIS
      // ============================================
      console.log(`[JobRunner] Running GitHub analysis...`);
      const githubResult = await analyzeGitHubRepo(url);
      
      resultData.githubAnalysis = JSON.stringify(githubResult);
      resultData.securityScore = githubResult.scores?.security ?? 0;
      resultData.codeQualityScore = githubResult.scores?.codeQuality ?? 0;
      resultData.overallScore = githubResult.scores?.overall ?? 0;
      
      // Log if analysis failed
      if (!githubResult.success) {
        console.error(`[JobRunner] GitHub analysis failed: ${githubResult.error}`);
      }
      
      // Convert GitHub issues to standard format
      const issues = [];
      const suggestions = githubResult.suggestions || [];
      
      // Add vulnerability issues
      if ((githubResult.security?.vulnerabilities?.critical ?? 0) > 0) {
        issues.push({
          severity: 'critical',
          category: 'security',
          title: `${githubResult.security?.vulnerabilities?.critical ?? 0} Critical Vulnerabilities`,
          description: 'Critical security vulnerabilities found in dependencies',
          impact: 'Your application may be vulnerable to attacks'
        });
      }
      if ((githubResult.security?.vulnerabilities?.high ?? 0) > 0) {
        issues.push({
          severity: 'major',
          category: 'security',
          title: `${githubResult.security?.vulnerabilities?.high ?? 0} High Severity Vulnerabilities`,
          description: 'High severity security issues in dependencies',
          impact: 'Security risk in your application'
        });
      }
      
      // Add code quality issues
      if (githubResult.codeQuality.eslintErrors > 0) {
        issues.push({
          severity: 'major',
          category: 'code-quality',
          title: `${githubResult.codeQuality.eslintErrors} ESLint Errors`,
          description: 'Code quality issues detected by ESLint',
          impact: 'May indicate bugs or poor code practices'
        });
      }
      
      resultData.issues = JSON.stringify(issues);
      resultData.suggestions = JSON.stringify(suggestions);
      resultData.metrics = JSON.stringify({
        stack: githubResult.stack,
        dependencies: githubResult.dependencies,
        vulnerabilities: githubResult.security.vulnerabilities
      });

    } else {
      // ============================================
      // DEPLOYMENT URL ANALYSIS
      // ============================================
      
      // Step 1: Basic URL analysis
      console.log(`[JobRunner] Running basic URL analysis...`);
      const urlResult = await analyzeUrl(url);
      
      resultData.performanceScore = urlResult.scores.performance;
      resultData.errorScore = urlResult.scores.error;
      resultData.durabilityScore = urlResult.scores.durability;
      resultData.issues = JSON.stringify(urlResult.issues);
      resultData.suggestions = JSON.stringify(urlResult.suggestions);
      resultData.metrics = JSON.stringify(urlResult.metrics);
      
      // Step 2: Lighthouse analysis (if enabled and URL is reachable)
      if (ENABLE_LIGHTHOUSE && urlResult.metrics.reachable) {
        console.log(`[JobRunner] Running Lighthouse analysis...`);
        try {
          const lighthouseResult = await analyzeFullLighthouse(url);
          
          if (lighthouseResult.mobile?.success) {
            const lh = lighthouseResult.mobile;
            
            resultData.lighthousePerformance = lh.scores.performance;
            resultData.lighthouseAccessibility = lh.scores.accessibility;
            resultData.lighthouseBestPractices = lh.scores.bestPractices;
            resultData.lighthouseSeo = lh.scores.seo;
            resultData.coreWebVitals = JSON.stringify(lh.coreWebVitals);
            resultData.lighthouseDetails = JSON.stringify({
              opportunities: lh.opportunities,
              diagnostics: lh.diagnostics,
              audits: lh.audits
            });
            
            // Add Lighthouse-based issues
            const existingIssues = urlResult.issues;
            
            if (lh.scores.performance < 50) {
              existingIssues.push({
                severity: 'major',
                category: 'performance',
                title: 'Poor Performance Score',
                description: `Lighthouse performance score is ${lh.scores.performance}/100`,
                impact: 'Slow pages lead to poor user experience and lower SEO rankings'
              });
            }
            
            if (lh.scores.accessibility < 80) {
              existingIssues.push({
                severity: 'major',
                category: 'accessibility',
                title: 'Accessibility Issues Detected',
                description: `Lighthouse accessibility score is ${lh.scores.accessibility}/100`,
                impact: 'Some users may have difficulty using your application'
              });
            }
            
            if (lh.scores.seo < 80) {
              existingIssues.push({
                severity: 'minor',
                category: 'seo',
                title: 'SEO Improvements Needed',
                description: `Lighthouse SEO score is ${lh.scores.seo}/100`,
                impact: 'Your site may not rank well in search engines'
              });
            }
            
            // Add Lighthouse opportunities as suggestions
            const existingSuggestions = urlResult.suggestions;
            for (const opp of lh.opportunities.slice(0, 5)) {
              existingSuggestions.push({
                priority: opp.score < 50 ? 'high' : 'medium',
                title: opp.title,
                description: opp.displayValue || opp.description,
                category: 'performance'
              });
            }
            
            resultData.issues = JSON.stringify(existingIssues);
            resultData.suggestions = JSON.stringify(existingSuggestions);
          }
        } catch (lhError) {
          console.error(`[JobRunner] Lighthouse error:`, lhError.message);
        }
      }
      
      // Calculate overall score (weighted)
      const lighthouseAvg = resultData.lighthousePerformance 
        ? Math.round(
            (resultData.lighthousePerformance * 0.4) +
            (resultData.lighthouseAccessibility * 0.2) +
            (resultData.lighthouseBestPractices * 0.2) +
            (resultData.lighthouseSeo * 0.2)
          )
        : null;
      
      // Overall = blend of basic checks and Lighthouse
      if (lighthouseAvg !== null) {
        resultData.overallScore = Math.round(
          (lighthouseAvg * 0.6) +
          (resultData.errorScore * 0.2) +
          (resultData.durabilityScore * 0.2)
        );
      } else {
        resultData.overallScore = Math.round(
          (resultData.performanceScore + resultData.errorScore + resultData.durabilityScore) / 3
        );
      }
    }

    resultData.analysisTimeMs = Date.now() - startTime;

    // Save the result
    await prisma.analysisResult.create({
      data: resultData
    });

    // Update project status to DONE
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'DONE' }
    });

    console.log(`[JobRunner] ✅ Completed: ${project.id} (Score: ${resultData.overallScore}/100, Time: ${resultData.analysisTimeMs}ms)`);

  } catch (error) {
    console.error(`[JobRunner] ❌ Failed: ${project.id}`, error.message);

    // Update project status to FAILED
    try {
      await prisma.project.update({
        where: { id: project.id },
        data: { status: 'FAILED' }
      });
    } catch (updateError) {
      console.error('[JobRunner] Failed to update status:', updateError.message);
    }

  } finally {
    currentJobs--;
  }
};

/**
 * Get job runner status
 */
const getStatus = () => ({
  isRunning,
  currentJobs,
  maxConcurrent: MAX_CONCURRENT,
  pollIntervalMs: POLL_INTERVAL_MS
});

module.exports = {
  start,
  stop,
  getStatus
};
