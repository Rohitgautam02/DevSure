/**
 * Project Controller
 * Handles project submission and retrieval
 */

const prisma = require('../config/prisma');

/**
 * Detect if URL is a GitHub repository
 */
const isGitHubRepo = (url) => {
  return url.includes('github.com') && 
    /github\.com\/[^\/]+\/[^\/\s\.]+/.test(url);
};

/**
 * Submit a new project for analysis
 * POST /api/projects/submit
 */
const submitProject = async (req, res, next) => {
  try {
    const { projectName, url } = req.body;
    const userId = req.user.id;

    // Detect input type
    const inputType = isGitHubRepo(url) ? 'github' : 'deployment';

    // Create project with PENDING status
    const project = await prisma.project.create({
      data: {
        userId,
        projectName,
        inputUrl: url,
        inputType,
        status: 'PENDING'
      }
    });

    res.status(201).json({
      message: `Project submitted successfully. ${inputType === 'github' ? 'Repository' : 'Deployment'} analysis will begin shortly.`,
      project: {
        id: project.id,
        projectName: project.projectName,
        inputUrl: project.inputUrl,
        inputType: project.inputType,
        status: project.status,
        createdAt: project.createdAt
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get all projects for the authenticated user
 * GET /api/projects
 */
const getProjects = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        analysisResult: {
          select: {
            overallScore: true,
            analyzedAt: true
          }
        }
      }
    });

    res.json({
      projects: projects.map(p => ({
        id: p.id,
        projectName: p.projectName,
        inputUrl: p.inputUrl,
        status: p.status,
        overallScore: p.analysisResult?.overallScore || null,
        analyzedAt: p.analysisResult?.analyzedAt || null,
        createdAt: p.createdAt
      }))
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get the status of a specific project
 * GET /api/projects/:id/status
 */
const getProjectStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const project = await prisma.project.findFirst({
      where: { id, userId },
      select: {
        id: true,
        projectName: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!project) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Project not found.'
      });
    }

    res.json({ project });

  } catch (error) {
    next(error);
  }
};

/**
 * Get the full analysis report for a project
 * GET /api/projects/:id/report
 */
const getProjectReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const project = await prisma.project.findFirst({
      where: { id, userId },
      include: {
        analysisResult: true
      }
    });

    if (!project) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Project not found.'
      });
    }

    if (project.status === 'PENDING') {
      return res.json({
        project: {
          id: project.id,
          projectName: project.projectName,
          inputUrl: project.inputUrl,
          status: project.status
        },
        message: 'Analysis is pending. Please wait.'
      });
    }

    if (project.status === 'ANALYZING') {
      return res.json({
        project: {
          id: project.id,
          projectName: project.projectName,
          inputUrl: project.inputUrl,
          status: project.status
        },
        message: 'Analysis is in progress. Please wait.'
      });
    }

    if (project.status === 'FAILED') {
      return res.json({
        project: {
          id: project.id,
          projectName: project.projectName,
          inputUrl: project.inputUrl,
          status: project.status
        },
        message: 'Analysis failed. Please try again.',
        report: null
      });
    }

    // Status is DONE
    res.json({
      project: {
        id: project.id,
        projectName: project.projectName,
        inputUrl: project.inputUrl,
        inputType: project.inputType,
        status: project.status,
        createdAt: project.createdAt
      },
      report: project.analysisResult ? {
        overallScore: project.analysisResult.overallScore,
        performanceScore: project.analysisResult.performanceScore,
        errorScore: project.analysisResult.errorScore,
        durabilityScore: project.analysisResult.durabilityScore,
        // Lighthouse scores
        lighthousePerformance: project.analysisResult.lighthousePerformance,
        lighthouseAccessibility: project.analysisResult.lighthouseAccessibility,
        lighthouseBestPractices: project.analysisResult.lighthouseBestPractices,
        lighthouseSeo: project.analysisResult.lighthouseSeo,
        coreWebVitals: project.analysisResult.coreWebVitals,
        lighthouseDetails: project.analysisResult.lighthouseDetails,
        // GitHub analysis
        githubAnalysis: project.analysisResult.githubAnalysis,
        codeQualityScore: project.analysisResult.codeQualityScore,
        securityScore: project.analysisResult.securityScore,
        // Common fields
        issues: JSON.parse(project.analysisResult.issues),
        suggestions: JSON.parse(project.analysisResult.suggestions),
        metrics: JSON.parse(project.analysisResult.metrics),
        analyzedAt: project.analysisResult.analyzedAt,
        analysisTimeMs: project.analysisResult.analysisTimeMs
      } : null
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete a project
 * DELETE /api/projects/:id
 */
const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id, userId }
    });

    if (!project) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Project not found.'
      });
    }

    // Delete project (cascade will delete analysis result)
    await prisma.project.delete({
      where: { id }
    });

    res.json({
      message: 'Project deleted successfully.'
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitProject,
  getProjects,
  getProjectStatus,
  getProjectReport,
  deleteProject
};
