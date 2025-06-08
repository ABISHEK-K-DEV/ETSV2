'use client';
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Box, FormControl, InputLabel, Select,
  MenuItem, Card, CardContent, Grid, CircularProgress, Alert, Avatar,
  TextField, IconButton
} from '@mui/material';
import {
  Edit, Delete, Add,
  EventNote as LeaveIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Block as BlockIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import axios from 'axios';
import dayjs from 'dayjs';

export default function LeaveTracker() {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [leaves, setLeaves] = useState([]);
  const [leaveStats, setLeaveStats] = useState({});
  const [open, setOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [formData, setFormData] = useState({
    member_id: '',
    leave_date: dayjs()
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (selectedMember) {
      fetchLeaves(selectedMember);
      calculateLeaveStats(selectedMember);
    }
  }, [selectedMember]);

  const fetchMembers = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/members');
      setMembers(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchLeaves = async (memberId) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:3001/api/leaves/${memberId}`, {
        params: { year: new Date().getFullYear() }
      });
      setLeaves(response.data);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateLeaveStats = async (memberId) => {
    try {
      const response = await axios.get(`http://localhost:3001/api/leaves/${memberId}`, {
        params: { year: new Date().getFullYear() }
      });
      const memberLeaves = response.data;
      
      const totalTaken = memberLeaves.length;
      const lopDays = memberLeaves.filter(leave => leave.is_lop).length;
      const validLeaves = totalTaken - lopDays;
      const remaining = Math.max(0, 12 - validLeaves);
      
      // Calculate monthly breakdown for salary deduction
      const monthlyBreakdown = {};
      const currentYear = new Date().getFullYear();
      
      // Initialize all months
      for (let i = 1; i <= 12; i++) {
        monthlyBreakdown[i] = {
          month: new Date(currentYear, i - 1).toLocaleDateString('en-US', { month: 'long' }),
          totalLeaves: 0,
          validLeaves: 0,
          lopLeaves: 0,
          deductibleLeaves: 0 // Leaves to be deducted from salary
        };
      }
      
      // Group leaves by month
      memberLeaves.forEach(leave => {
        const month = leave.month;
        monthlyBreakdown[month].totalLeaves++;
        
        if (leave.is_lop) {
          monthlyBreakdown[month].lopLeaves++;
          monthlyBreakdown[month].deductibleLeaves++; // LOP days are deductible
        } else {
          monthlyBreakdown[month].validLeaves++;
        }
      });
      
      setLeaveStats({
        totalTaken,
        validLeaves,
        lopDays,
        remaining,
        carryForward: 0,
        monthlyBreakdown
      });
    } catch (error) {
      console.error('Error calculating leave stats:', error);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await axios.post('http://localhost:3001/api/leaves', {
        member_id: formData.member_id,
        leave_date: formData.leave_date.format('YYYY-MM-DD')
      });
      
      setOpen(false);
      setFormData({ member_id: '', leave_date: dayjs() });
      
      if (selectedMember) {
        fetchLeaves(selectedMember);
        calculateLeaveStats(selectedMember);
      }
      
      if (response.data.isLop) {
        alert('This leave is marked as Loss of Pay (LOP) as monthly limit exceeded.');
      }
    } catch (error) {
      console.error('Error adding leave:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpen = (leave = null) => {
    if (leave) {
      setEditingLeave(leave);
      setFormData(leave);
    } else {
      setEditingLeave(null);
      setFormData({
        member_id: '',
        leave_date: dayjs()
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingLeave(null);
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  };

  const handleSave = () => {
    const days = calculateDays(formData.startDate, formData.endDate);
    const leaveData = { ...formData, days };
    
    if (editingLeave) {
      setLeaves(leaves.map(leave => 
        leave.id === editingLeave.id ? { ...leaveData, id: editingLeave.id } : leave
      ));
    } else {
      setLeaves([...leaves, { ...leaveData, id: Date.now() }]);
    }
    handleClose();
  };

  const handleDelete = (id) => {
    setLeaves(leaves.filter(leave => leave.id !== id));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Rejected': return 'error';
      case 'Pending': return 'warning';
      default: return 'default';
    }
  };

  const getLeaveStats = () => {
    const totalLeaves = leaves.length;
    const approvedLeaves = leaves.filter(l => l.status === 'Approved').length;
    const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
    const totalDays = leaves.filter(l => l.status === 'Approved').reduce((sum, l) => sum + l.days, 0);
    
    return { totalLeaves, approvedLeaves, pendingLeaves, totalDays };
  };

  const stats = getLeaveStats();

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '';
  };

  const selectedMemberData = members.find(m => m.id === parseInt(selectedMember));

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
            Leave Tracker
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor and manage team member leave records
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<LeaveIcon />}
          onClick={() => handleOpen()}
          sx={{ minWidth: 140 }}
        >
          Record Leave
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Select Team Member</InputLabel>
            <Select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
            >
              {members.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 32, height: 32, fontSize: 14 }}>
                      {getInitials(member.name)}
                    </Avatar>
                    {member.name} - {member.position}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {selectedMember && (
        <>
          {/* Member Info Card */}
          {selectedMemberData && (
            <Card sx={{ mb: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 48, height: 48 }}>
                    {getInitials(selectedMemberData.name)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {selectedMemberData.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedMemberData.position} • Joined {new Date(selectedMemberData.date_joined).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Leave Statistics */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <CalendarIcon sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                  <Typography variant="h4" fontWeight={700} color="info.main">
                    {leaveStats.totalTaken || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Leaves Taken
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <CheckIcon sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {leaveStats.validLeaves || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Valid Leaves
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <BlockIcon sx={{ fontSize: 32, color: 'error.main', mb: 1 }} />
                  <Typography variant="h4" fontWeight={700} color="error.main">
                    {leaveStats.lopDays || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    LOP Days
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <TrendingUpIcon sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    {leaveStats.remaining || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Remaining Leaves
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Monthly Breakdown Section */}
          {leaveStats.monthlyBreakdown && (
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  Monthly Leave Summary - For Salary Deduction
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(leaveStats.monthlyBreakdown).map(([monthNum, data]) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={monthNum}>
                      <Card 
                        variant="outlined" 
                        sx={{ 
                          bgcolor: data.deductibleLeaves > 0 ? 'error.50' : 'success.50',
                          border: '1px solid',
                          borderColor: data.deductibleLeaves > 0 ? 'error.200' : 'success.200'
                        }}
                      >
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                            {data.month}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Total:
                            </Typography>
                            <Typography variant="caption" fontWeight={500}>
                              {data.totalLeaves}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" color="success.main">
                              Valid:
                            </Typography>
                            <Typography variant="caption" fontWeight={500} color="success.main">
                              {data.validLeaves}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" color="error.main">
                              LOP:
                            </Typography>
                            <Typography variant="caption" fontWeight={500} color="error.main">
                              {data.lopLeaves}
                            </Typography>
                          </Box>
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              pt: 1, 
                              borderTop: '1px solid',
                              borderColor: 'divider'
                            }}
                          >
                            <Typography variant="caption" fontWeight={600}>
                              Deduct from Salary:
                            </Typography>
                            <Typography 
                              variant="caption" 
                              fontWeight={700}
                              color={data.deductibleLeaves > 0 ? 'error.main' : 'success.main'}
                            >
                              {data.deductibleLeaves} days
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                
                {/* Summary for HR/Payroll */}
                <Box sx={{ mt: 3, p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Payroll Summary:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Total LOP days for salary deduction: <strong>{leaveStats.lopDays} days</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Only LOP leaves are deducted from salary (beyond 1 leave per month)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Valid leaves (1st leave of each month) are not deducted
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Leave History */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={40} />
            </Box>
          ) : (
            <Paper sx={{ overflow: 'hidden' }}>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'grey.200' }}>
                <Typography variant="h6" fontWeight={600}>
                  Leave History - {new Date().getFullYear()}
                </Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: 'grey.50' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Leave Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Month</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Year</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leaves.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                          <LeaveIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                          <Typography variant="body1" color="text.secondary">
                            No leave records found for this member.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      leaves.map((leave) => (
                        <TableRow key={leave.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                              <Typography variant="body2">
                                {new Date(leave.leave_date).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {leave.month}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {leave.year}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {leave.is_lop ? (
                                <BlockIcon sx={{ fontSize: 16, color: 'error.main', mr: 1 }} />
                              ) : (
                                <CheckIcon sx={{ fontSize: 16, color: 'success.main', mr: 1 }} />
                              )}
                              <Typography 
                                variant="body2" 
                                fontWeight={500}
                                color={leave.is_lop ? 'error.main' : 'success.main'}
                              >
                                {leave.is_lop ? 'LOP' : 'Valid'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <IconButton onClick={() => handleOpen(leave)} color="primary">
                              <Edit />
                            </IconButton>
                            <IconButton onClick={() => handleDelete(leave.id)} color="error">
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
        </>
      )}
    

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingLeave ? 'Edit Leave Request' : 'New Leave Request'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Member</InputLabel>
              <Select
                value={formData.member_id}
                onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                required
              >
                {members.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 28, height: 28, fontSize: 12 }}>
                        {getInitials(member.name)}
                      </Avatar>
                      {member.name} - {member.position}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <DatePicker
              label="Leave Date"
              value={formData.leave_date}
              onChange={(date) => setFormData({ ...formData, leave_date: date })}
              sx={{ mt: 2, width: '100%' }}
              maxDate={dayjs()}
            />
            <FormControl fullWidth>
              <InputLabel>Leave Type</InputLabel>
              <Select
                value={formData.leaveType}
                onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                label="Leave Type"
              >
                <MenuItem value="Vacation">Vacation</MenuItem>
                <MenuItem value="Sick">Sick Leave</MenuItem>
                <MenuItem value="Personal">Personal</MenuItem>
                <MenuItem value="Emergency">Emergency</MenuItem>
                <MenuItem value="Maternity">Maternity</MenuItem>
                <MenuItem value="Paternity">Paternity</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={editingLeave ? handleSave : handleSubmit} variant="contained">
            {editingLeave ? 'Update' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
