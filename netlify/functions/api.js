const express = require('express');
const serverless = require('serverless-http');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

// CORS configuration
app.use(cors({
  origin: ['https://estv2.netlify.app', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection for serverless environment
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'estimation_tracker',
  connectionLimit: 10
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Import your API routes here
app.get('/api/test', async (req, res) => {
  try {
    res.json({ 
      message: 'API is working on Netlify', 
      timestamp: new Date().toISOString(),
      server: 'Netlify Functions'
    });
  } catch (error) {
    res.status(500).json({ error: 'API test failed', details: error.message });
  }
});

// Redirect all API routes from the main server file
// You'll need to copy all your API endpoints from server/index.js to here

// Handle 404
app.use('/.netlify/functions/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Export the server for serverless use
module.exports.handler = serverless(app);
