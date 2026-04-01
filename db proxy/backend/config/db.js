const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'hello',
    database: process.env.DB_NAME || 'test_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
let pool;

// Initialize connection pool
async function initializePool() {
    try {
        // First create connection without database to check if DB exists
        const tempConnection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });
        
        // Check if database exists
        const [databases] = await tempConnection.query(
            `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${dbConfig.database}'`
        );
        
        if (databases.length === 0) {
            console.log(`📁 Database '${dbConfig.database}' not found. Creating...`);
            await tempConnection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
            console.log(`✅ Database '${dbConfig.database}' created successfully`);
        }
        
        await tempConnection.end();
        
        // Create pool with database
        pool = mysql.createPool(dbConfig);
        return true;
    } catch (error) {
        console.error('❌ Database initialization error:', error.message);
        return false;
    }
}

// Test database connection
async function testConnection() {
    try {
        if (!pool) {
            await initializePool();
        }
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Execute query with validation
async function executeQuery(query, params = []) {
    let connection;
    try {
        if (!pool) {
            await initializePool();
        }
        connection = await pool.getConnection();
        const [rows] = await connection.execute(query, params);
        return {
            success: true,
            data: rows,
            affectedRows: rows.affectedRows || rows.length
        };
    } catch (error) {
        console.error('Query execution error:', error);
        return {
            success: false,
            error: error.message
        };
    } finally {
        if (connection) connection.release();
    }
}

// Create sample tables if not exists
async function initializeDatabase() {
    try {
        if (!pool) {
            await initializePool();
        }
        
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                age INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        const createProductsTable = `
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                stock INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        const createLogsTable = `
            CREATE TABLE IF NOT EXISTS query_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_name VARCHAR(100),
                query_text TEXT,
                query_status VARCHAR(20),
                message TEXT,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        await pool.execute(createUsersTable);
        await pool.execute(createProductsTable);
        await pool.execute(createLogsTable);
        console.log('✅ Tables created/verified');
        
        // Check if users table has data
        const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
        if (userCount[0].count === 0) {
            const sampleUsers = `
                INSERT INTO users (name, email, age) VALUES 
                ('John Doe', 'john@example.com', 25),
                ('Jane Smith', 'jane@example.com', 30),
                ('Bob Johnson', 'bob@example.com', 35),
                ('Alice Brown', 'alice@example.com', 28),
                ('Charlie Wilson', 'charlie@example.com', 32)
            `;
            await pool.execute(sampleUsers);
            console.log('✅ Sample users inserted');
        }
        
        // Check if products table has data
        const [productCount] = await pool.execute('SELECT COUNT(*) as count FROM products');
        if (productCount[0].count === 0) {
            const sampleProducts = `
                INSERT INTO products (name, price, stock) VALUES 
                ('Laptop', 999.99, 10),
                ('Mouse', 29.99, 50),
                ('Keyboard', 79.99, 30),
                ('Monitor', 299.99, 15),
                ('Headphones', 89.99, 25)
            `;
            await pool.execute(sampleProducts);
            console.log('✅ Sample products inserted');
        }
        
    } catch (error) {
        console.error('Error initializing database:', error.message);
    }
}

module.exports = {
    pool: () => pool,
    testConnection,
    executeQuery,
    initializeDatabase,
    initializePool
};