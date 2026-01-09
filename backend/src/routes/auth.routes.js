/**
 * Authentication Routes
 * Handles user registration and login
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { registerValidation, loginValidation } = require('../middlewares/validate');
const authenticate = require('../middlewares/authenticate');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', registerValidation, authController.register);

/**
 * POST /api/auth/login
 * Login user and get JWT token
 */
router.post('/login', loginValidation, authController.login);

/**
 * GET /api/auth/me
 * Get current user profile (requires auth)
 */
router.get('/me', authenticate, authController.getProfile);

module.exports = router;
