// config/db.js
const mysql = require('mysql2');

// Create a connection pool using environment variables
// using mysql2/promise to support async/await syntax naturally
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'material_optimization_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

// Test the connection immediately
promisePool.getConnection()
    .then(connection => {
        console.log('Successfully connected to the MySQL Database.');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to the MySQL Database:', err);
    });

module.exports = promisePool;
