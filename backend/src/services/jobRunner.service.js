/**
 * Job Runner Service
 * Polls the database for pending analysis jobs
 * Lightweight alternative to Redis for low-resource systems
 */

const prisma = require('../config/prisma');
const { analyzeUrl } = require('../analyzers/urlAnalyzer');

// Configuration
const POLL_INTERVAL_MS = parseInt(process.env.ANALYSIS_POLL_INTERVAL_MS) || 10000;
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_ANALYSES) || 1;

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

    console.log(`[JobRunner] Analyzing: ${project.inputUrl}`);

    // Run the analysis
    const analysisResult = await analyzeUrl(project.inputUrl);

    // Save the result
    await prisma.analysisResult.create({
      data: {
        projectId: project.id,
        overallScore: analysisResult.scores.overall,
        performanceScore: analysisResult.scores.performance,
        errorScore: analysisResult.scores.error,
        durabilityScore: analysisResult.scores.durability,
        issues: JSON.stringify(analysisResult.issues),
        suggestions: JSON.stringify(analysisResult.suggestions),
        metrics: JSON.stringify(analysisResult.metrics),
        analysisTimeMs: Date.now() - startTime
      }
    });

    // Update project status to DONE
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'DONE' }
    });

    console.log(`[JobRunner] ✅ Completed: ${project.id} (Score: ${analysisResult.scores.overall}/100)`);

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
