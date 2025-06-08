const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

// CORS setup
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection - Use environment variables for production
// You'll need to set these in Netlify's environment variables section
const getDbConfig = () => {
  // Use environment variables in production
  if (process.env.NODE_ENV === 'production') {
    return {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    };
  }
  
  // Default local config
  return {
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'estimation_tracker'
  };
};

// Handler for all API requests
exports.handler = async (event, context) => {
  // For OPTIONS requests (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: ''
    };
  }
  
  // Extract the path and method
  const path = event.path.replace('/.netlify/functions/api', '');
  const method = event.httpMethod;
  
  try {
    let connection;
    let result;
    
    // Basic test endpoint
    if (path === '/test' && method === 'GET') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'API is working on Netlify',
          timestamp: new Date().toISOString()
        })
      };
    }

    // Connect to database for data endpoints
    try {
      const dbConfig = getDbConfig();
      connection = await mysql.createConnection(dbConfig);
    } catch (error) {
      console.error('Database connection error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Database connection failed',
          details: error.message
        })
      };
    }

    // Handle different API endpoints
    if (path === '/dashboard' && method === 'GET') {
      const [projects] = await connection.execute(`
        SELECT p.*, GROUP_CONCAT(m.name) as team_members 
        FROM projects p 
        LEFT JOIN project_members pm ON p.id = pm.project_id 
        LEFT JOIN members m ON pm.member_id = m.id 
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `);
      
      result = projects;
    }
    
    else if (path === '/members' && method === 'GET') {
      const [members] = await connection.execute('SELECT * FROM members ORDER BY created_at DESC');
      result = members;
    }
    
    else if (path === '/projects' && method === 'GET') {
      const [projects] = await connection.execute(`
        SELECT p.*, GROUP_CONCAT(DISTINCT m.name) as team_members,
              GROUP_CONCAT(DISTINCT m.id) as member_ids
        FROM projects p 
        LEFT JOIN project_members pm ON p.id = pm.project_id 
        LEFT JOIN members m ON pm.member_id = m.id 
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `);
      result = projects;
    }
    
    // Add other API endpoints here following the same pattern
    // Example for POST requests:
    else if (path === '/members' && method === 'POST') {
      const body = JSON.parse(event.body);
      // Process the request similar to your existing server code
      // Return appropriate response
    }

    // Close the database connection
    if (connection) {
      await connection.end();
    }

    // Return 404 if no endpoint matched
    if (!result) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'API endpoint not found' })
      };
    }

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('API error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};
