const express = require('express');
const router = express.Router();
const queryController = require('../controllers/queryController');
const logger = require('../middleware/logger');

// Execute query through proxy
router.post('/execute', logger.logQuery, queryController.executeQuery);

// Get query history for current user
router.get('/history', queryController.getHistory);

// Get all company logs (for company view)
router.get('/logs', queryController.getCompanyLogs);

// Get analytics data
router.get('/analytics', queryController.getAnalytics);

module.exports = router;