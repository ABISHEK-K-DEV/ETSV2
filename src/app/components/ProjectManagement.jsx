'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  LinearProgress
} from '@mui/material';
import {
  Edit,
  Delete,
  Add as AddIcon,
  Assignment as ProjectIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as ProgressIcon,
  Group as TeamIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import axios from 'axios';
import dayjs from 'dayjs';

export default function ProjectManagement() {
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: dayjs(),
    expected_end_date: dayjs().add(1, 'month'),
    budget: '',
    progress: 0,
    status: 'Active',
    member_ids: []
  });

  useEffect(() => {
    fetchProjects();
    fetchMembers();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('http://localhost:3001/api/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/members');
      setMembers(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleOpen = (project = null) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        ...project,
        start_date: dayjs(project.start_date),
        expected_end_date: dayjs(project.expected_end_date),
        member_ids: Array.isArray(project.member_ids) ? project.member_ids : []
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        description: '',
        start_date: dayjs(),
        expected_end_date: dayjs().add(1, 'month'),
        budget: '',
        progress: 0,
        status: 'Active',
        member_ids: []
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingProject(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Please enter a project name.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      if (editingProject) {
        await axios.put(`http://localhost:3001/api/projects/${editingProject.id}`, {
          ...formData,
          start_date: formData.start_date.format('YYYY-MM-DD'),
          expected_end_date: formData.expected_end_date.format('YYYY-MM-DD')
        });
      } else {
        await axios.post('http://localhost:3001/api/projects', {
          ...formData,
          start_date: formData.start_date.format('YYYY-MM-DD'),
          expected_end_date: formData.expected_end_date.format('YYYY-MM-DD')
        });
      }
      setOpen(false);
      setFormData({
        name: '',
        description: '',
        start_date: dayjs(),
        expected_end_date: dayjs().add(1, 'month'),
        budget: '',
        progress: 0,
        status: 'Active',
        member_ids: []
      });
      fetchProjects();
    } catch (error) {
      console.error('Error saving project:', error);
      setError('Failed to save project. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:3001/api/projects/${id}`);
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('Failed to delete project. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Completed': return 'primary';
      case 'On Hold': return 'warning';
      case 'Cancelled': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
            Project Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create and manage your projects efficiently
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{ minWidth: 140 }}
        >
          Add Project
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={40} />
        </Box>
      ) : (
        <Paper sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Project Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Start Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>End Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Budget</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Progress</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                      <ProjectIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        No projects found. Create your first project to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project) => (
                    <TableRow key={project.id} hover>
                      <TableCell>{project.name}</TableCell>
                      <TableCell>{project.description}</TableCell>
                      <TableCell>{new Date(project.start_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(project.expected_end_date).toLocaleDateString()}</TableCell>
                      <TableCell>${project.budget?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={project.progress} 
                            sx={{ width: 100 }}
                          />
                          <Typography variant="body2">{project.progress}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={project.status} 
                          color={getStatusColor(project.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleOpen(project)} color="primary">
                          <Edit />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(project.id)} color="error">
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingProject ? 'Edit Project' : 'Add New Project'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Project Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <DatePicker
              label="Start Date"
              value={formData.start_date}
              onChange={(date) => setFormData({ ...formData, start_date: date })}
              sx={{ width: '100%' }}
            />
            <DatePicker
              label="End Date"
              value={formData.expected_end_date}
              onChange={(date) => setFormData({ ...formData, expected_end_date: date })}
              sx={{ width: '100%' }}
              minDate={formData.start_date}
            />
            <TextField
              label="Budget"
              type="number"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) })}
              fullWidth
            />
            <TextField
              label="Progress (%)"
              type="number"
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
              inputProps={{ min: 0, max: 100 }}
              fullWidth
            />
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Assign Team Members</InputLabel>
              <Select
                multiple
                value={Array.isArray(formData.member_ids) ? formData.member_ids : []}
                onChange={(e) => setFormData({ ...formData, member_ids: e.target.value })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {Array.isArray(selected) ? selected.map((value) => {
                      const member = members.find(m => m.id === value);
                      return (
                        <Chip 
                          key={value} 
                          label={member?.name} 
                          size="small"
                          icon={<TeamIcon />}
                        />
                      );
                    }) : null}
                  </Box>
                )}
              >
                {members.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
                    {member.name} - {member.role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="On Hold">On Hold</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {submitting ? 'Saving...' : editingProject ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
