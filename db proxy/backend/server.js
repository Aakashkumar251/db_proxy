const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const queryRoutes = require('./routes/queryRoutes');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api', queryRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'DB Proxy Shield is running',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: err.message
    });
});

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
    console.log('📁 Logs directory created');
}

// Initialize database and start server
async function startServer() {
    try {
        // Initialize database connection
        await db.initializePool();
        
        // Test database connection
        const connected = await db.testConnection();
        
        if (connected) {
            // Initialize database with sample data
            await db.initializeDatabase();
            
            // Start server
            app.listen(PORT, () => {
                console.log(`
╔═══════════════════════════════════════════════════════╗
║     🛡️  DB Proxy Shield Server Started Successfully  ║
╠═══════════════════════════════════════════════════════╣
║  🌐 Server:     http://localhost:${PORT}                ║
║  📡 API Base:   http://localhost:${PORT}/api           ║
║  📊 Dashboard:  http://localhost:${PORT}/dashboard.html ║
║  💾 Database:   Connected & Ready                      ║
╚═══════════════════════════════════════════════════════╝
                `);
            });
        } else {
            console.error('⚠️  Failed to connect to database. Starting server with limited functionality...');
            console.log('Please check your MySQL credentials in backend/config/db.js');
            
            // Start server even without database (for frontend only)
            app.listen(PORT, () => {
                console.log(`
╔═══════════════════════════════════════════════════════╗
║     ⚠️  DB Proxy Shield Server Started (Limited)     ║
╠═══════════════════════════════════════════════════════╣
║  🌐 Server:     http://localhost:${PORT}                ║
║  📊 Dashboard:  http://localhost:${PORT}/dashboard.html ║
║  ❌ Database:   Not Connected                          ║
╠═══════════════════════════════════════════════════════╣
║  Please check your MySQL configuration:               ║
║  1. Ensure MySQL is running                           ║
║  2. Check credentials in backend/config/db.js        ║
║  3. Create database: CREATE DATABASE test_db;        ║
╚═══════════════════════════════════════════════════════╝
                `);
            });
        }
    } catch (error) {
        console.error('Error starting server:', error);
        
        // Start server anyway for frontend
        app.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════════════╗
║     ❌ DB Proxy Shield Server Started (Error Mode)   ║
╠═══════════════════════════════════════════════════════╣
║  🌐 Server: http://localhost:${PORT}                   ║
║  📊 Frontend only - Database features unavailable    ║
╚═══════════════════════════════════════════════════════╝
            `);
        });
    }
}

startServer();