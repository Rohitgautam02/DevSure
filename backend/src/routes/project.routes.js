/**
 * Project Routes
 * Handles project submission and analysis
 */

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const authenticate = require('../middlewares/authenticate');
const { submitProjectValidation, projectIdValidation } = require('../middlewares/validate');

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/projects/submit
 * Submit a new project URL for analysis
 */
router.post('/submit', submitProjectValidation, projectController.submitProject);

/**
 * GET /api/projects
 * Get all projects for the authenticated user
 */
router.get('/', projectController.getProjects);

/**
 * GET /api/projects/:id/status
 * Get the analysis status of a specific project
 */
router.get('/:id/status', projectIdValidation, projectController.getProjectStatus);

/**
 * GET /api/projects/:id/report
 * Get the full analysis report for a project
 */
router.get('/:id/report', projectIdValidation, projectController.getProjectReport);

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete('/:id', projectIdValidation, projectController.deleteProject);

module.exports = router;
