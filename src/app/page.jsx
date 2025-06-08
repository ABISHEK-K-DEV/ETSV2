'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  CircularProgress,
  Alert,
  Typography,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import axios from 'axios';
import TaskManagement from './components/TaskManagement';
import ProjectManagement from './components/ProjectManagement';
import MemberManagement from './components/MemberManagement';
import LeaveTracker from './components/LeaveTracker';
import SidebarLayout from './components/SidebarLayout';
import NoSSR from './components/NoSSR';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

const tabLabels = ['Tasks', 'Projects', 'Team Members', 'Leave Tracker'];

export default function Dashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // For Netlify deployment, we'll use mock data instead of trying to connect to a database
  const isNetlify = typeof window !== 'undefined' && 
    window.location.hostname.includes('netlify.app');
  
  const apiBaseUrl = isNetlify 
    ? '/api' // Use relative path for Netlify (will be handled by our mock data approach)
    : 'http://localhost:3001/api';

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (isNetlify) {
        // Use mock data for Netlify deployment
        setTimeout(() => {
          setProjects([
            {
              id: 1,
              name: "Demo Project 1",
              description: "This is a demo project for Netlify deployment",
              start_date: "2023-01-01",
              expected_end_date: "2023-12-31",
              budget: 50000,
              progress: 65,
              status: "Active",
              team_members: "John Doe, Jane Smith"
            },
            {
              id: 2,
              name: "Demo Project 2",
              description: "Another demo project for Netlify",
              start_date: "2023-02-15",
              expected_end_date: "2023-10-15",
              budget: 75000,
              progress: 40,
              status: "Active",
              team_members: "Alice Brown, Bob Johnson"
            }
          ]);
          setLoading(false);
        }, 500); // Simulate API delay
      } else {
        // For local development, use the real API
        const response = await axios.get(`${apiBaseUrl}/dashboard`);
        setProjects(response.data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to load project data. Please try again.');
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <NoSSR fallback={<div style={{ height: '100vh', backgroundColor: '#1e293b' }} />}>
      <SidebarLayout activeTab={tabValue} onTabChange={handleTabChange}>
        {/* Header Section */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            py: 4,
            px: 4,
            mb: 0,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            },
          }}
        >
          <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
            <Breadcrumbs
              separator={<NavigateNextIcon fontSize="small" />}
              sx={{
                mb: 2,
                '& .MuiBreadcrumbs-separator': { color: 'rgba(255, 255, 255, 0.7)' },
              }}
            >
              <Link
                underline="hover"
                sx={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)' }}
              >
                <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Dashboard
              </Link>
              <Typography sx={{ color: 'white', fontWeight: 600 }}>
                {tabLabels[tabValue]}
              </Typography>
            </Breadcrumbs>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
              {tabLabels[tabValue]} Management
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: 600 }}>
              {tabValue === 0 && "Assign, track, and manage tasks across your projects with real-time updates."}
              {tabValue === 1 && "Create and oversee projects with comprehensive tracking and team collaboration."}
              {tabValue === 2 && "Manage your team members, roles, and organizational structure efficiently."}
              {tabValue === 3 && "Monitor leave requests and maintain accurate attendance records."}
            </Typography>
          </Container>
        </Box>

        {/* Content Section */}
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                '& .MuiAlert-icon': { fontSize: '1.5rem' }
              }} 
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <Paper 
            sx={{ 
              minHeight: 'calc(100vh - 300px)',
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <TabPanel value={tabValue} index={0}>
              <TaskManagement />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <ProjectManagement />
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              <MemberManagement />
            </TabPanel>
            <TabPanel value={tabValue} index={3}>
              <LeaveTracker />
            </TabPanel>
          </Paper>
        </Container>
      </SidebarLayout>
    </NoSSR>
  );
}
