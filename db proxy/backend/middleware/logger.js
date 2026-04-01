const fs = require('fs').promises;
const path = require('path');

const LOG_FILE = path.join(__dirname, '../../logs/queries.log');

// Middleware to log all incoming requests
async function logRequest(req, res, next) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    };
    
    try {
        await fs.appendFile(
            LOG_FILE,
            JSON.stringify(logEntry) + '\n'
        );
    } catch (error) {
        console.error('Error logging request:', error);
    }
    
    next();
}

// Log query execution
async function logQuery(req, res, next) {
    const originalJson = res.json;
    
    res.json = function(data) {
        // Log the response if it contains query execution result
        if (req.body && req.body.query) {
            const logEntry = {
                type: 'query_execution',
                timestamp: new Date().toISOString(),
                user: req.body.user || 'anonymous',
                query: req.body.query,
                result: data.success ? 'success' : 'failed',
                message: data.message
            };
            
            fs.appendFile(LOG_FILE, JSON.stringify(logEntry) + '\n')
                .catch(err => console.error('Error logging query:', err));
        }
        
        originalJson.call(this, data);
    };
    
    next();
}

module.exports = {
    logRequest,
    logQuery
};