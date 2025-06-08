const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enhanced CORS configuration for development and production
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://127.0.0.1:3000', 
    'http://127.0.0.1:3001', 
    'https://estv2.netlify.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced debugging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    params: req.params,
    contentType: req.headers['content-type']
  });
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Database connection
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'admin',
  database: 'estimation_tracker',
  connectionLimit: 10
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database and tables
async function initDatabase() {
  try {
    // First, connect without specifying a database to create it
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    
    // Create database if it doesn't exist
    await connection.execute('CREATE DATABASE IF NOT EXISTS estimation_tracker');
    await connection.end();
    
    // Now connect to the specific database using pool
    const dbConnection = await pool.getConnection();
    
    // Members table - simplified to match frontend
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        position VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        date_joined DATE NOT NULL,
        salary DECIMAL(10,2),
        status ENUM('Active', 'Inactive', 'On Leave') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Projects table - simplified to match frontend
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE NOT NULL,
        expected_end_date DATE NOT NULL,
        budget DECIMAL(12,2),
        progress INT DEFAULT 0,
        status ENUM('Active', 'Completed', 'On Hold', 'Cancelled') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Project members junction table
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS project_members (
        project_id INT,
        member_id INT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
        PRIMARY KEY (project_id, member_id)
      )
    `);

    // Tasks table - simplified to match frontend
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        project_id INT,
        assignee_id INT,
        assigned_date DATE NOT NULL,
        due_date DATE,
        status ENUM('To Do', 'In Progress', 'Completed', 'On Hold') DEFAULT 'To Do',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (assignee_id) REFERENCES members(id) ON DELETE CASCADE
      )
    `);

    // Leaves table - simplified to match frontend
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS leaves (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT,
        leave_date DATE NOT NULL,
        year INT NOT NULL,
        month INT NOT NULL,
        is_lop BOOLEAN DEFAULT FALSE,
        status ENUM('Valid', 'LOP') DEFAULT 'Valid',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
      )
    `);

    dbConnection.release();
    console.log('Database and tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Test database connection endpoint
app.get('/api/test', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();
    res.json({ 
      message: 'Database connection successful', 
      timestamp: new Date().toISOString(),
      server: 'EST Backend Server'
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ error: 'Database connection failed', details: error.message });
  }
});

// API Routes
app.get('/api/dashboard', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [projects] = await connection.execute(`
      SELECT p.*, GROUP_CONCAT(m.name) as team_members 
      FROM projects p 
      LEFT JOIN project_members pm ON p.id = pm.project_id 
      LEFT JOIN members m ON pm.member_id = m.id 
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    connection.release();
    res.json(projects);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data', details: error.message });
  }
});

app.get('/api/members', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [members] = await connection.execute('SELECT * FROM members ORDER BY created_at DESC');
    connection.release();
    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members', details: error.message });
  }
});

app.post('/api/members', async (req, res) => {
  let connection;
  try {
    console.log('Received member request:', req.body);
    
    const { 
      name, 
      email,
      position,
      department,
      joinDate,
      salary,
      status = 'Active'
    } = req.body;
    
    // Validation
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required and cannot be empty' });
    }
    
    if (!position?.trim()) {
      return res.status(400).json({ error: 'Position is required and cannot be empty' });
    }
    
    if (!joinDate?.trim()) {
      return res.status(400).json({ error: 'Join date is required and cannot be empty' });
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(joinDate)) {
      return res.status(400).json({ error: 'Join date must be in YYYY-MM-DD format' });
    }
    
    connection = await pool.getConnection();
    const [result] = await connection.execute(
      'INSERT INTO members (name, email, position, department, date_joined, salary, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), email || null, position.trim(), department || null, joinDate, salary || null, status]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      message: 'Member added successfully',
      member: { 
        id: result.insertId, 
        name: name.trim(), 
        email,
        position: position.trim(), 
        department,
        date_joined: joinDate,
        salary,
        status
      }
    });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add member', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.put('/api/members/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { name, email, position, department, joinDate, salary, status } = req.body;
    
    // Validation
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required and cannot be empty' });
    }
    
    if (!position?.trim()) {
      return res.status(400).json({ error: 'Position is required and cannot be empty' });
    }
    
    connection = await pool.getConnection();
    await connection.execute(
      'UPDATE members SET name = ?, email = ?, position = ?, department = ?, date_joined = ?, salary = ?, status = ? WHERE id = ?',
      [name.trim(), email || null, position.trim(), department || null, joinDate, salary || null, status, id]
    );
    connection.release();
    res.json({ message: 'Member updated successfully' });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update member' });
  } finally {
    if (connection) connection.release();
  }
});

app.delete('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    await connection.execute('DELETE FROM members WHERE id = ?', [id]);
    connection.release();
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [projects] = await connection.execute(`
      SELECT p.*, GROUP_CONCAT(DISTINCT m.name) as team_members,
             GROUP_CONCAT(DISTINCT m.id) as member_ids
      FROM projects p 
      LEFT JOIN project_members pm ON p.id = pm.project_id 
      LEFT JOIN members m ON pm.member_id = m.id 
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    connection.release();
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
  }
});

app.post('/api/projects', async (req, res) => {
  let connection;
  try {
    console.log('Received project request:', req.body);
    
    const { 
      name, 
      description,
      start_date, 
      expected_end_date, 
      budget,
      progress = 0,
      status = 'Active',
      member_ids = [] 
    } = req.body;
    
    // Validation
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Project name is required and cannot be empty' });
    }
    
    if (!start_date?.trim()) {
      return res.status(400).json({ error: 'Start date is required and cannot be empty' });
    }
    
    if (!expected_end_date?.trim()) {
      return res.status(400).json({ error: 'Expected end date is required and cannot be empty' });
    }
    
    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date)) {
      return res.status(400).json({ error: 'Start date must be in YYYY-MM-DD format' });
    }
    
    if (!dateRegex.test(expected_end_date)) {
      return res.status(400).json({ error: 'Expected end date must be in YYYY-MM-DD format' });
    }
    
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const [result] = await connection.execute(
      'INSERT INTO projects (name, description, start_date, expected_end_date, budget, progress, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), description || null, start_date, expected_end_date, budget || null, progress, status]
    );
    
    const projectId = result.insertId;
    
    // Add project members
    if (Array.isArray(member_ids) && member_ids.length > 0) {
      for (const memberId of member_ids) {
        if (memberId && !isNaN(memberId)) {
          await connection.execute(
            'INSERT INTO project_members (project_id, member_id) VALUES (?, ?)',
            [projectId, parseInt(memberId)]
          );
        }
      }
    }
    
    await connection.commit();
    
    res.status(201).json({ 
      id: projectId, 
      message: 'Project created successfully',
      project: { 
        id: projectId, 
        name: name.trim(), 
        description,
        start_date, 
        expected_end_date,
        budget,
        progress,
        status
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.put('/api/projects/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { name, description, start_date, expected_end_date, budget, progress, status, member_ids } = req.body;
    
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    // Update project details
    await connection.execute(
      'UPDATE projects SET name = ?, description = ?, start_date = ?, expected_end_date = ?, budget = ?, progress = ?, status = ? WHERE id = ?',
      [name, description || null, start_date, expected_end_date, budget || null, progress || 0, status || 'Active', id]
    );
    
    // Update project members if provided
    if (member_ids !== undefined) {
      // Remove existing members
      await connection.execute('DELETE FROM project_members WHERE project_id = ?', [id]);
      
      // Add new members
      if (Array.isArray(member_ids) && member_ids.length > 0) {
        for (const memberId of member_ids) {
          if (memberId && !isNaN(memberId)) {
            await connection.execute(
              'INSERT INTO project_members (project_id, member_id) VALUES (?, ?)',
              [id, parseInt(memberId)]
            );
          }
        }
      }
    }
    
    await connection.commit();
    res.json({ message: 'Project updated successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  } finally {
    if (connection) connection.release();
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    await connection.execute('DELETE FROM projects WHERE id = ?', [id]);
    connection.release();
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const { date, project_id, assignee_id } = req.query;
    let query = `
      SELECT t.*, p.name as project_name, m.name as assignee_name 
      FROM tasks t 
      JOIN projects p ON t.project_id = p.id 
      JOIN members m ON t.assignee_id = m.id 
      WHERE 1=1
    `;
    const params = [];
    
    if (date) {
      query += ' AND t.assigned_date = ?';
      params.push(date);
    }
    if (project_id) {
      query += ' AND t.project_id = ?';
      params.push(project_id);
    }
    if (assignee_id) {
      query += ' AND t.assignee_id = ?';
      params.push(assignee_id);
    }
    
    const connection = await pool.getConnection();
    const [tasks] = await connection.execute(query, params);
    connection.release();
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/tasks', async (req, res) => {
  let connection;
  try {
    console.log('Received task request:', req.body);
    
    const { title, project_id, assignee_id, assigned_date, status = 'In Progress' } = req.body;
    
    // Validation
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Task title is required and cannot be empty' });
    }
    
    if (!project_id || isNaN(project_id)) {
      return res.status(400).json({ error: 'Valid project ID is required' });
    }
    
    if (!assignee_id || isNaN(assignee_id)) {
      return res.status(400).json({ error: 'Valid assignee ID is required' });
    }
    
    if (!assigned_date?.trim()) {
      return res.status(400).json({ error: 'Assigned date is required and cannot be empty' });
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(assigned_date)) {
      return res.status(400).json({ error: 'Assigned date must be in YYYY-MM-DD format' });
    }
    
    connection = await pool.getConnection();
    const [result] = await connection.execute(
      'INSERT INTO tasks (title, project_id, assignee_id, assigned_date, status) VALUES (?, ?, ?, ?, ?)',
      [title.trim(), parseInt(project_id), parseInt(assignee_id), assigned_date, status]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      message: 'Task assigned successfully',
      task: { id: result.insertId, title: title.trim(), project_id, assignee_id, assigned_date, status }
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, status, project_id, assignee_id, assigned_date } = req.body;
    
    const connection = await pool.getConnection();
    
    // Build dynamic update query
    const updates = [];
    const params = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (project_id !== undefined) {
      updates.push('project_id = ?');
      params.push(project_id);
    }
    if (assignee_id !== undefined) {
      updates.push('assignee_id = ?');
      params.push(assignee_id);
    }
    if (assigned_date !== undefined) {
      updates.push('assigned_date = ?');
      params.push(assigned_date);
    }
    
    if (updates.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(id);
    const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
    
    await connection.execute(query, params);
    connection.release();
    res.json({ message: 'Task updated successfully' });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    await connection.execute('DELETE FROM tasks WHERE id = ?', [id]);
    connection.release();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

app.get('/api/leaves/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { year } = req.query;
    const selectedYear = year || new Date().getFullYear();
    
    const connection = await pool.getConnection();
    // Get all leaves for the specified year
    const [leaves] = await connection.execute(
      'SELECT * FROM leaves WHERE member_id = ? AND year = ? ORDER BY month ASC, leave_date ASC',
      [memberId, selectedYear]
    );
    connection.release();
    res.json(leaves);
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({ error: 'Failed to fetch leaves' });
  }
});

app.post('/api/leaves', async (req, res) => {
  let connection;
  try {
    console.log('Received leave request:', req.body);
    
    const { member_id, leave_date, year } = req.body;
    
    if (!member_id || isNaN(member_id)) {
      return res.status(400).json({ error: 'Valid member ID is required' });
    }
    
    if (!leave_date?.trim()) {
      return res.status(400).json({ error: 'Leave date is required and cannot be empty' });
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(leave_date)) {
      return res.status(400).json({ error: 'Leave date must be in YYYY-MM-DD format' });
    }
    
    const date = new Date(leave_date);
    const leaveYear = year || date.getFullYear();
    const month = date.getMonth() + 1;
    
    connection = await pool.getConnection();
    
    // Get all existing leaves for this member in this year
    const [allYearLeaves] = await connection.execute(
      'SELECT * FROM leaves WHERE member_id = ? AND year = ? ORDER BY leave_date ASC',
      [parseInt(member_id), leaveYear]
    );
    
    // Calculate if this is an LOP leave based on the yearly quota of 12 days
    // Only count non-LOP leaves toward the quota
    const validLeavesCount = allYearLeaves.filter(leave => !leave.is_lop).length;
    const YEARLY_LEAVE_QUOTA = 12;
    const isLop = validLeavesCount >= YEARLY_LEAVE_QUOTA;
    
    const [result] = await connection.execute(
      'INSERT INTO leaves (member_id, leave_date, year, month, is_lop) VALUES (?, ?, ?, ?, ?)',
      [parseInt(member_id), leave_date, leaveYear, month, isLop]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      message: 'Leave recorded successfully', 
      isLop,
      leave: { id: result.insertId, member_id, leave_date, year: leaveYear, month, is_lop: isLop }
    });
  } catch (error) {
    console.error('Error recording leave:', error);
    res.status(500).json({ error: 'Failed to record leave', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.delete('/api/leaves/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    // Get the leave details before deleting
    const [leaveDetails] = await connection.execute(
      'SELECT member_id, year, month, is_lop FROM leaves WHERE id = ?',
      [id]
    );
    
    if (leaveDetails.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Leave record not found' });
    }
    
    // Delete the leave
    await connection.execute('DELETE FROM leaves WHERE id = ?', [id]);
    
    // If this was a successful deletion, we need to recalculate LOP status for other leaves
    if (leaveDetails[0]) {
      const { member_id, year } = leaveDetails[0];
      
      // Get all remaining leaves for this member in this year
      const [remainingLeaves] = await connection.execute(
        'SELECT id FROM leaves WHERE member_id = ? AND year = ? ORDER BY leave_date ASC',
        [member_id, year]
      );
      
      // Update LOP status for all leaves
      // First 12 leaves are valid, the rest are LOP
      const YEARLY_LEAVE_QUOTA = 12;
      
      // Update each leave's LOP status
      for (let i = 0; i < remainingLeaves.length; i++) {
        const isLop = i >= YEARLY_LEAVE_QUOTA;
        await connection.execute(
          'UPDATE leaves SET is_lop = ? WHERE id = ?',
          [isLop, remainingLeaves[i].id]
        );
      }
    }
    
    connection.release();
    res.json({ message: 'Leave deleted successfully' });
  } catch (error) {
    console.error('Error deleting leave:', error);
    res.status(500).json({ error: 'Failed to delete leave' });
  }
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test the server at: http://localhost:${PORT}/api/test`);
  await initDatabase();
});
