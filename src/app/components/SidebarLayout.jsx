'use client';
import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Divider,
  Paper,
  useTheme
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as ProjectIcon,
  Task as TaskIcon,
  EventNote as LeaveIcon,
  Business as BusinessIcon
} from '@mui/icons-material';

const drawerWidth = 280;

const navigationItems = [
  { label: 'Tasks', icon: <TaskIcon />, value: 0, color: '#6366f1' },
  { label: 'Projects', icon: <ProjectIcon />, value: 1, color: '#8b5cf6' },
  { label: 'Team Members', icon: <PeopleIcon />, value: 2, color: '#06b6d4' },
  { label: 'Leave Tracker', icon: <LeaveIcon />, value: 3, color: '#10b981' },
];

export default function SidebarLayout({ children, activeTab, onTabChange }) {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #1e293b 0%, #334155 100%)',
            color: 'white',
            border: 'none',
            boxShadow: '4px 0 20px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        {/* Header */}
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Avatar
            sx={{
              width: 60,
              height: 60,
              mx: 'auto',
              mb: 2,
              bgcolor: '#6366f1',
              fontSize: '1.5rem',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
          >
            <BusinessIcon fontSize="large" />
          </Avatar>
          <Typography variant="h6" fontWeight={700} sx={{ color: 'white', mb: 0.5 }}>
            Estimation Tracker
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Project Management Suite
          </Typography>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mx: 2 }} />

        {/* Navigation */}
        <List sx={{ px: 2, py: 3 }}>
          {navigationItems.map((item) => (
            <ListItem
              key={item.value}
              onClick={() => onTabChange(null, item.value)}
              sx={{
                mb: 1,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                bgcolor: activeTab === item.value ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                  transform: 'translateX(4px)',
                },
                '&.Mui-selected': {
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: activeTab === item.value ? item.color : 'rgba(255, 255, 255, 0.7)',
                  minWidth: 40,
                  transition: 'color 0.3s ease',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                sx={{
                  '& .MuiTypography-root': {
                    color: activeTab === item.value ? 'white' : 'rgba(255, 255, 255, 0.8)',
                    fontWeight: activeTab === item.value ? 600 : 500,
                    fontSize: '0.95rem',
                  },
                }}
              />
              {activeTab === item.value && (
                <Box
                  sx={{
                    width: 4,
                    height: 20,
                    bgcolor: item.color,
                    borderRadius: '2px',
                    boxShadow: `0 0 8px ${item.color}`,
                  }}
                />
              )}
            </ListItem>
          ))}
        </List>

        {/* Footer */}
        <Box sx={{ mt: 'auto', p: 3, textAlign: 'center' }}>
          <Paper
            sx={{
              p: 2,
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Version 2.0.1
            </Typography>
            <Typography variant="caption" display="block" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              © 2024 EST Pro
            </Typography>
          </Paper>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: '#f8fafc',
          minHeight: '100vh',
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
