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
  Avatar,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  PersonAdd as PersonAddIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
  BeachAccess as VacationIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import axios from 'axios';
import dayjs from 'dayjs';

export default function MemberManagement() {
  const [members, setMembers] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    position: '',
    department: '',
    joinDate: dayjs(),
    salary: '',
    status: 'Active'
  });

  // For Netlify deployment, we'll use mock data instead of trying to connect to a database
  const isNetlify = typeof window !== 'undefined' && 
    window.location.hostname.includes('netlify.app');
  
  const apiBaseUrl = isNetlify 
    ? '/api' // Use relative path for Netlify (will be handled by our mock data approach)
    : 'http://localhost:3001/api';

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (isNetlify) {
        // Use mock data for Netlify deployment
        setTimeout(() => {
          setMembers([
            {
              id: 1,
              name: "John Doe",
              email: "john@example.com",
              position: "Senior Developer",
              department: "Engineering",
              date_joined: "2020-01-15",
              salary: 85000,
              status: "Active"
            },
            {
              id: 2,
              name: "Jane Smith",
              email: "jane@example.com",
              position: "Project Manager",
              department: "Management",
              date_joined: "2019-08-10",
              salary: 95000,
              status: "Active"
            }
          ]);
          setLoading(false);
        }, 500); // Simulate API delay
      } else {
        // For local development, use the real API
        const response = await axios.get(`${apiBaseUrl}/members`);
        setMembers(response.data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setError('Failed to load members. Please try again.');
      setLoading(false);
    }
  };

  const handleOpen = (member = null) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name || '',
        email: member.email || '',
        position: member.position || '',
        department: member.department || '',
        joinDate: dayjs(member.date_joined),
        salary: member.salary || '',
        status: member.status || 'Active'
      });
    } else {
      setEditingMember(null);
      setFormData({
        name: '',
        email: '',
        position: '',
        department: '',
        joinDate: dayjs(),
        salary: '',
        status: 'Active'
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingMember(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.position.trim()) {
      setError('Please fill in all required fields (Name and Position).');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      // Ensure joinDate is valid
      const joinDateFormatted = formData.joinDate && formData.joinDate.isValid() 
        ? formData.joinDate.format('YYYY-MM-DD')
        : dayjs().format('YYYY-MM-DD');
      
      const memberData = {
        name: formData.name.trim(),
        email: formData.email?.trim() || '',
        position: formData.position.trim(),
        department: formData.department?.trim() || '',
        joinDate: joinDateFormatted,
        salary: parseInt(formData.salary) || 0,
        status: formData.status || 'Active'
      };

      if (editingMember) {
        await axios.put(`${apiBaseUrl}/members/${editingMember.id}`, memberData);
      } else {
        await axios.post(`${apiBaseUrl}/members`, memberData);
      }
      
      handleClose();
      fetchMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      setError(error.response?.data?.error || 'Failed to save member. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${apiBaseUrl}/members/${id}`);
      setMembers(members.filter(member => member.id !== id));
    } catch (error) {
      console.error('Error deleting member:', error);
      setError('Failed to delete member. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Inactive': return 'error';
      case 'On Leave': return 'warning';
      default: return 'default';
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
            Team Members
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your team members and their information
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<PersonAddIcon />}
          onClick={() => handleOpen()}
          sx={{ minWidth: 140 }}
        >
          Add Member
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
                  <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Position</TableCell>  {/* Changed from 'Role' to 'Position' */}
                  <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Join Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Salary</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                      <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        No team members found. Add your first member to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 36, height: 36 }}>
                            {getInitials(member.name)}
                          </Avatar>
                          <Typography variant="body1" fontWeight={500}>
                            {member.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.position}</TableCell>  {/* Changed from 'role' to 'position' */}
                      <TableCell>{member.department || 'N/A'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                          <Typography variant="body2">
                            {new Date(member.date_joined).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>${member.salary?.toLocaleString() || '0'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={member.status} 
                          color={getStatusColor(member.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleOpen(member)} color="primary">
                          <Edit />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(member.id)} color="error">
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
          {editingMember ? 'Edit Member' : 'Add New Member'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
          
           
            <FormControl fullWidth>
              <InputLabel>Position</InputLabel>  {/* Changed from 'Role' to 'Position' */}
              <Select
                value={formData.position}  // Changed from 'role' to 'position'
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}  // Changed from 'role' to 'position'
                label="Position"  // Changed from 'Role' to 'Position'
              >
                <MenuItem value="Developer">Developer</MenuItem>
                <MenuItem value="Designer">Designer</MenuItem>  
                <MenuItem value="Manager">Manager</MenuItem>
                <MenuItem value="Analyst">Analyst</MenuItem>
                <MenuItem value="Intern">Intern</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                label="Department"
              >
                <MenuItem value="IT">IT</MenuItem>
                <MenuItem value="Engineering">Engineering</MenuItem>
                <MenuItem value="Product">Product</MenuItem>
                <MenuItem value="Design">Design</MenuItem>
                <MenuItem value="Data Science">Data Science</MenuItem>
                <MenuItem value="DevOps">DevOps</MenuItem>
                <MenuItem value="Quality Assurance">Quality Assurance</MenuItem>
                <MenuItem value="Marketing">Marketing</MenuItem>
                <MenuItem value="Sales">Sales</MenuItem>
                <MenuItem value="Human Resources">Human Resources</MenuItem>
                <MenuItem value="Finance">Finance</MenuItem>
                <MenuItem value="Operations">Operations</MenuItem>
              </Select>
            </FormControl>

            <DatePicker
              label="Join Date"
              value={formData.joinDate}
              onChange={(date) => setFormData({ ...formData, joinDate: date })}
              sx={{ width: '100%' }}
              maxDate={dayjs()}
            />
            <TextField
              label="Salary"
              type="number"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: parseInt(e.target.value) })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
                <MenuItem value="On Leave">On Leave</MenuItem>
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
            startIcon={submitting ? <CircularProgress size={16} /> : <PersonAddIcon />}
          >
            {submitting ? 'Saving...' : editingMember ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

