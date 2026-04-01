const validator = require('../utils/validator');
const db = require('../config/db');
const fs = require('fs').promises;
const path = require('path');

// In-memory storage for history (in production, use database)
let queryHistory = [];
const LOG_FILE = path.join(__dirname, '../../logs/queries.log');

// Execute query through proxy
async function executeQuery(req, res) {
    const { query, user } = req.body;
    const timestamp = new Date().toISOString();
    
    if (!query) {
        return res.status(400).json({
            success: false,
            message: 'No query provided'
        });
    }
    
    // Validate query for safety
    const validation = validator.validateQuery(query);
    
    // Log the query
    const logEntry = {
        timestamp,
        user: user || 'anonymous',
        query,
        status: validation.isSafe ? 'safe' : 'unsafe',
        message: validation.message
    };
    
    await logToFile(logEntry);
    
    // Add to history
    queryHistory.unshift(logEntry);
    // Keep only last 100 entries
    if (queryHistory.length > 100) queryHistory.pop();
    
    // If query is not safe, reject it
    if (!validation.isSafe) {
        return res.json({
            success: false,
            message: validation.message,
            query: query,
            status: 'blocked'
        });
    }
    
    // Execute safe query
    try {
        // Remove dangerous keywords and execute
        const safeQuery = validator.sanitizeQuery(query);
        const result = await db.executeQuery(safeQuery);
        
        if (result.success) {
            return res.json({
                success: true,
                message: 'Query executed successfully',
                result: result.data,
                affectedRows: result.affectedRows
            });
        } else {
            return res.json({
                success: false,
                message: `Database error: ${result.error}`,
                result: null
            });
        }
    } catch (error) {
        console.error('Query execution error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while executing query'
        });
    }
}

// Get query history
async function getHistory(req, res) {
    try {
        // Read from log file and filter by user (simplified)
        const logs = await readLogs();
        const userHistory = logs.filter(log => 
            log.user === (req.query.user || 'anonymous')
        ).slice(0, 50);
        
        res.json({
            success: true,
            history: userHistory
        });
    } catch (error) {
        console.error('Error getting history:', error);
        res.json({
            success: true,
            history: queryHistory.slice(0, 50)
        });
    }
}

// Get company logs
async function getCompanyLogs(req, res) {
    try {
        const logs = await readLogs();
        res.json({
            success: true,
            logs: logs.slice(0, 100) // Last 100 logs
        });
    } catch (error) {
        console.error('Error getting company logs:', error);
        res.json({
            success: true,
            logs: queryHistory.slice(0, 100)
        });
    }
}

// Get analytics
async function getAnalytics(req, res) {
    try {
        const logs = await readLogs();
        const safeCount = logs.filter(log => log.status === 'safe').length;
        const blockedCount = logs.filter(log => log.status === 'unsafe').length;
        
        res.json({
            success: true,
            safeCount,
            blockedCount,
            totalCount: safeCount + blockedCount
        });
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.json({
            success: true,
            safeCount: 0,
            blockedCount: 0,
            totalCount: 0
        });
    }
}

// Log to file
async function logToFile(entry) {
    try {
        const logLine = JSON.stringify(entry) + '\n';
        await fs.appendFile(LOG_FILE, logLine);
    } catch (error) {
        console.error('Error writing to log file:', error);
    }
}

// Read logs from file
async function readLogs() {
    try {
        const data = await fs.readFile(LOG_FILE, 'utf8');
        const lines = data.trim().split('\n');
        return lines
            .filter(line => line.trim())
            .map(line => JSON.parse(line))
            .reverse();
    } catch (error) {
        return [];
    }
}

module.exports = {
    executeQuery,
    getHistory,
    getCompanyLogs,
    getAnalytics
};