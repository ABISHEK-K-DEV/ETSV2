'use client';
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Box, FormControl, InputLabel, Select,
  MenuItem, Card, CardContent, Grid, CircularProgress, Alert, Avatar,
  TextField, IconButton, Tooltip, Divider, Chip
} from '@mui/material';
import {
  Edit, Delete, Add,
  EventNote as LeaveIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Block as BlockIcon,
  ArrowForward as ArrowForwardIcon
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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Define API URL based on environment
  const isNetlify = typeof window !== 'undefined' && 
    window.location.hostname.includes('netlify.app');
  
  const apiBaseUrl = isNetlify 
    ? '/api' // Use relative path for Netlify (will be handled by our mock data approach)
    : 'http://localhost:3001/api';

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (selectedMember) {
      fetchLeaves(selectedMember);
      calculateLeaveStats(selectedMember);
    }
  }, [selectedMember, selectedYear]);

  const fetchMembers = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/members');
      setMembers(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
      setError('Failed to fetch team members. Please try again.');
    }
  };

  const fetchLeaves = async (memberId) => {
    try {
      setLoading(true);
      
      if (isNetlify) {
        // Use mock data for Netlify deployment
        setTimeout(() => {
          setLeaves([
            {
              id: 1,
              leave_date: "2023-05-10",
              year: 2023,
              month: 5,
              is_lop: false,
              status: "Valid"
            },
            {
              id: 2,
              leave_date: "2023-06-15",
              year: 2023,
              month: 6,
              is_lop: false,
              status: "Valid"
            }
          ]);
          setLoading(false);
        }, 500); // Simulate API delay
      } else {
        // For local development, use the real API
        const response = await axios.get(`${apiBaseUrl}/leaves/${memberId}`, {
          params: { year: selectedYear }
        });
        setLeaves(response.data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
      setError('Failed to load leave data');
      setLoading(false);
    }
  };

  const calculateLeaveStats = async (memberId) => {
    try {
      const response = await axios.get(`${apiBaseUrl}/leaves/${memberId}`, {
        params: { year: selectedYear }
      });
      const memberLeaves = response.data;
      
      // Initialize monthly data
      const monthlyBreakdown = {};
      for (let i = 1; i <= 12; i++) {
        monthlyBreakdown[i] = {
          month: new Date(selectedYear, i - 1).toLocaleDateString('en-US', { month: 'long' }),
          totalLeaves: 0,
          validLeaves: 0,
          lopLeaves: 0,
          carryForward: 0,
          unusedLeave: 0
        };
      }
      
      // First count all leaves by month
      memberLeaves.forEach(leave => {
        const month = leave.month;
        monthlyBreakdown[month].totalLeaves++;
        
        if (leave.is_lop) {
          monthlyBreakdown[month].lopLeaves++;
        } else {
          monthlyBreakdown[month].validLeaves++;
        }
      });
      
      // Calculate carry forward for each month
      let carryForward = 0; // Start with 0 from previous year
      const MONTHLY_QUOTA = 1; // 1 per month
      
      for (let i = 1; i <= 12; i++) {
        // Set the carry forward from previous month
        monthlyBreakdown[i].carryForward = carryForward;
        
        // Calculate available leaves for this month (monthly quota + carry forward)
        const availableLeaves = MONTHLY_QUOTA + carryForward;
        
        // Calculate how many valid leaves were used this month (can't exceed available)
        const usedValidLeaves = Math.min(monthlyBreakdown[i].validLeaves, availableLeaves);
        
        // Calculate unused leaves for this month
        const unusedLeave = availableLeaves - usedValidLeaves;
        monthlyBreakdown[i].unusedLeave = unusedLeave;
        
        // Carry forward to next month
        carryForward = unusedLeave;
      }
      
      // Calculate total statistics
      let totalValidLeaves = 0;
      let totalLopLeaves = 0;
      
      for (let i = 1; i <= 12; i++) {
        totalValidLeaves += monthlyBreakdown[i].validLeaves;
        totalLopLeaves += monthlyBreakdown[i].lopLeaves;
      }
      
      const YEARLY_QUOTA = 12;
      const remaining = Math.max(0, YEARLY_QUOTA - totalValidLeaves);
      
      setLeaveStats({
        totalTaken: totalValidLeaves + totalLopLeaves,
        validLeaves: totalValidLeaves,
        lopDays: totalLopLeaves,
        remaining: remaining,
        yearlyQuota: YEARLY_QUOTA,
        monthlyBreakdown,
        carryForward // Current carry forward at the end of displayed data
      });
    } catch (error) {
      console.error('Error calculating leave stats:', error);
      setError('Failed to calculate leave statistics. Please try again.');
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    
    try {
      if (!formData.member_id) {
        setError('Please select a team member');
        setSubmitting(false);
        return;
      }
      
      // Get current leave balance if not already available
      let leaveBalance = formData.leaveBalance;
      if (!leaveBalance && formData.member_id) {
        leaveBalance = await getLeaveBalance(formData.member_id, selectedYear);
      }
      
      // Include carry forward information when creating the leave
      const response = await axios.post('http://localhost:3001/api/leaves', {
        member_id: formData.member_id,
        leave_date: formData.leave_date.format('YYYY-MM-DD'),
        year: selectedYear,
        // Include carry forward details for better LOP calculation on server
        totalAvailable: leaveBalance ? leaveBalance.totalAvailable : null,
        carryForward: leaveBalance ? leaveBalance.carryForward : 0
      });
      
      setOpen(false);
      setFormData({ member_id: '', leave_date: dayjs() });
      
      if (selectedMember) {
        fetchLeaves(selectedMember);
        calculateLeaveStats(selectedMember);
      }
      
      if (response.data.isLop) {
        setError('Note: This leave has been marked as Loss of Pay (LOP) as you have used all available leaves including carry forward.');
      }
    } catch (error) {
      console.error('Error adding leave:', error);
      setError(error.response?.data?.error || 'Failed to record leave. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    try {
      await axios.delete(`http://localhost:3001/api/leaves/${leaveId}`);
      
      if (selectedMember) {
        fetchLeaves(selectedMember);
        calculateLeaveStats(selectedMember);
      }
    } catch (error) {
      console.error('Error deleting leave:', error);
      setError('Failed to delete leave record. Please try again.');
    }
  };

  // Enhance the getLeaveBalance function to include carry forward info and correctly apply it
  const getLeaveBalance = async (memberId, year) => {
    try {
      const response = await axios.get(`${apiBaseUrl}/leaves/${memberId}`, {
        params: { year: year }
      });
      const memberLeaves = response.data;
      
      // Sort leaves by date to ensure proper order when calculating
      memberLeaves.sort((a, b) => new Date(a.leave_date) - new Date(b.leave_date));
      
      // Calculate monthly breakdowns to get carry forward
      const monthlyData = {};
      for (let i = 1; i <= 12; i++) {
        monthlyData[i] = {
          validLeaves: 0,
          lopLeaves: 0,
          carryForward: 0,
          unusedLeave: 0,
          leavesTaken: [] // Track actual leaves for recalculation
        };
      }
      
      // First count all leaves by month and track them
      memberLeaves.forEach(leave => {
        const month = leave.month;
        if (!monthlyData[month]) return;
        
        // Store the leave reference in the month data for recalculation
        monthlyData[month].leavesTaken.push(leave);
        
        if (leave.is_lop) {
          monthlyData[month].lopLeaves++;
        } else {
          monthlyData[month].validLeaves++;
        }
      });
      
      // Calculate carry forward for each month and reconsider if leaves should be LOP
      let carryForward = 0;
      let totalValidLeaves = 0;
      let totalLopLeaves = 0;
      let availableQuota = 0;
      
      // Calculate what the status of each leave SHOULD be based on carry forward
      for (let i = 1; i <= 12; i++) {
        // Store the carry forward coming into this month
        monthlyData[i].carryForward = carryForward;
        
        // Calculate available leaves for this month (monthly quota + carry forward)
        const monthlyQuota = 1; // 1 leave per month
        const availableLeaves = monthlyQuota + carryForward;
        availableQuota += monthlyQuota;
        
        // Reset counters to recalculate based on the leaves taken this month
        let validLeavesThisMonth = 0;
        let lopLeavesThisMonth = 0;
        
        // Sort leaves by date within month to ensure chronological processing
        monthlyData[i].leavesTaken.sort((a, b) => new Date(a.leave_date) - new Date(b.leave_date));
        
        // Determine which leaves should be valid and which should be LOP
        // based on the available leaves with carry forward
        monthlyData[i].leavesTaken.forEach((leave, index) => {
          // If we still have available leaves (including carry forward), this should be valid
          // Otherwise, it should be LOP
          const shouldBeLop = index >= availableLeaves;
          
          if (shouldBeLop) {
            lopLeavesThisMonth++;
            totalLopLeaves++;
          } else {
            validLeavesThisMonth++;
            totalValidLeaves++;
          }
        });
        
        // Update the month's valid and LOP counts based on our recalculation
        monthlyData[i].validLeaves = validLeavesThisMonth;
        monthlyData[i].lopLeaves = lopLeavesThisMonth;
        
        // Calculate unused leaves to carry forward to next month
        const unusedLeave = availableLeaves - validLeavesThisMonth;
        monthlyData[i].unusedLeave = unusedLeave;
        
        // Update carry forward for next month
        carryForward = unusedLeave;
      }
      
      // Get current month for accurate carry forward
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      // Only show carry forward for current or past months
      const applicableMonth = year < currentYear ? 12 : 
                            year > currentYear ? 1 : 
                            currentMonth;
      
      // For months beyond current, use only the quota up to current month
      const effectiveCarryForward = monthlyData[applicableMonth]?.carryForward || 0;
      
      // Calculate remaining from yearly quota (12) minus valid leaves taken
      const YEARLY_QUOTA = 12;
      const quotaRemaining = Math.max(0, YEARLY_QUOTA - totalValidLeaves);
      
      // Calculate total available leaves including remaining quota and carry forward
      const totalAvailable = quotaRemaining + effectiveCarryForward;
      
      return {
        taken: totalValidLeaves,
        remaining: quotaRemaining,
        total: YEARLY_QUOTA,
        carryForward: effectiveCarryForward,
        monthlyData: monthlyData,
        applicableMonth: applicableMonth,
        totalAvailable: totalAvailable, // New field with total available leaves
        availableQuota: availableQuota, // Quota that has become available so far this year
        usedLopLeaves: totalLopLeaves
      };
    } catch (error) {
      console.error('Error calculating leave balance:', error);
      return { 
        taken: 0, 
        remaining: 12, 
        total: 12, 
        carryForward: 0,
        monthlyData: {},
        applicableMonth: new Date().getMonth() + 1,
        totalAvailable: 12,
        availableQuota: 0,
        usedLopLeaves: 0
      };
    }
  };

  // Update the handleOpen function to fetch leave balance
  const handleOpen = async (leave = null) => {
    setSubmitting(true); // Show loading while fetching data
    
    if (leave) {
      setEditingLeave(leave);
      setFormData({
        ...leave,
        member_id: leave.member_id,
        leave_date: dayjs(leave.leave_date)
      });
    } else {
      setEditingLeave(null);
      setFormData({
        member_id: selectedMember || '',
        leave_date: dayjs(),
        leaveBalance: null
      });
      
      // If member is already selected, fetch their leave balance
      if (selectedMember) {
        const balance = await getLeaveBalance(selectedMember, selectedYear);
        setFormData(prev => ({
          ...prev,
          leaveBalance: balance
        }));
      }
    }
    
    setSubmitting(false);
    setOpen(true);
  };

  // Update the form's member selection to fetch balance when member changes
  const handleMemberChange = async (e) => {
    const memberId = e.target.value;
    setFormData({ ...formData, member_id: memberId, leaveBalance: null });
    
    if (memberId) {
      setSubmitting(true);
      const balance = await getLeaveBalance(memberId, selectedYear);
      setFormData(prev => ({
        ...prev,
        leaveBalance: balance
      }));
      setSubmitting(false);
    }
  };
  
  const getSelectedMemberData = () => {
    return members.find(m => m.id === parseInt(selectedMember));
  };
  
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
  };

  const selectedMemberData = getSelectedMemberData();

  // Add this function below the handleOpen function
  const handleClose = () => {
    setOpen(false);
    setEditingLeave(null);
    setError(null);
  };
  
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
            Leave Tracker
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor and manage team member leave records with automatic carry forward
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
        <Alert 
          severity={error.includes('Note:') ? "info" : "error"} 
          sx={{ mb: 3 }} 
          onClose={() => setError(null)}
        >
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
                      {member.name ? member.name.split(' ').map(n => n[0]).join('').toUpperCase() : ''}
                    </Avatar>
                    {member.name} - {member.position}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Year</InputLabel>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {getYearOptions().map((year) => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {(selectedMember && (
        <>
          {/* Member Info Card */}
          {selectedMemberData && (
            <Card sx={{ mb: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 48, height: 48 }}>
                    {selectedMemberData.name ? selectedMemberData.name.split(' ').map(n => n[0]).join('').toUpperCase() : ''}
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
                  Monthly Leave Summary with Carry Forward
                </Typography>
                
                <Box sx={{ mb: 3, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Leave Policy:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Each employee is entitled to 12 paid leaves per year
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Leaves can be taken in any month throughout the year
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Additional leaves beyond the yearly allowance of 12 days are marked as Loss of Pay (LOP)
                  </Typography>
                </Box>
                
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Month</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">Carried Forward</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">Monthly Quota</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">Available Leaves</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">Valid Leaves Taken</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">LOP Leaves</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">Unused Leaves</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(leaveStats.monthlyBreakdown).map(([monthNum, data]) => (
                        <TableRow 
                          key={monthNum}
                          sx={{
                            bgcolor: parseInt(monthNum) === new Date().getMonth() + 1 && 
                              selectedYear === new Date().getFullYear() ? 'rgba(255, 235, 59, 0.1)' : 'inherit'
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {data.month}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              size="small" 
                              label={data.carryForward} 
                              variant="outlined" 
                              color="primary"
                              sx={{ minWidth: 32 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">1</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight={600}>
                              {data.carryForward + 1}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              size="small" 
                              label={data.validLeaves} 
                              color="success" 
                              variant={data.validLeaves > 0 ? "filled" : "outlined"}
                              sx={{ minWidth: 32 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              size="small" 
                              label={data.lopLeaves} 
                              color="error" 
                              variant={data.lopLeaves > 0 ? "filled" : "outlined"} 
                              sx={{ minWidth: 32 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Chip 
                                size="small" 
                                label={data.unusedLeave} 
                                color="warning"
                                variant="outlined"
                                sx={{ minWidth: 32 }}
                              />
                              {parseInt(monthNum) < 12 && data.unusedLeave > 0 && (
                                <ArrowForwardIcon 
                                  color="action" 
                                  fontSize="small" 
                                  sx={{ ml: 0.5, opacity: 0.6 }} 
                                />
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {/* Summary for HR/Payroll */}
                <Box sx={{ mt: 3, p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Payroll Summary:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Total LOP days for salary deduction: <strong>{leaveStats.lopDays} days</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Only LOP leaves are deducted from salary
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Current carry forward balance: <strong>{leaveStats.carryForward || 0} days</strong>
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
                  Leave History - {selectedYear}
                </Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: 'grey.50' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Leave Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Month</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leaves.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
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
                              {new Date(leave.leave_date).toLocaleDateString('en-US', { month: 'long' })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {leave.is_lop ? (
                                <Tooltip title="Loss of Pay - Will be deducted from salary">
                                  <Chip
                                    icon={<BlockIcon fontSize="small" />}
                                    label="LOP"
                                    size="small"
                                    color="error"
                                  />
                                </Tooltip>
                              ) : (
                                <Tooltip title="Valid Leave - Within monthly quota">
                                  <Chip
                                    icon={<CheckIcon fontSize="small" />}
                                    label="Valid"
                                    size="small"
                                    color="success"
                                  />
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <IconButton 
                              onClick={() => handleDeleteLeave(leave.id)} 
                              color="error"
                              size="small"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Add yearly leave quota information */}
              <Box sx={{ p: 2, mt: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Yearly Leave Summary - {selectedYear}:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                    Total yearly quota: <strong>12 days</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                    Used valid leaves: <strong>{leaveStats.validLeaves || 0} days</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                    Remaining leaves: <strong>{12 - (leaveStats.validLeaves || 0)} days</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                    LOP leaves: <strong>{leaveStats.lopDays || 0} days</strong>
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}
        </>
      ))}

    
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
                onChange={handleMemberChange}
                required
              >
                {members.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 28, height: 28, fontSize: 12 }}>
                        {member.name ? member.name.split(' ').map(n => n[0]).join('').toUpperCase() : ''}
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
            
            {formData.leaveBalance && (
              <Card variant="outlined" sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Leave Balance for {selectedYear}:
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'primary.50', height: '100%' }}>
                        <Typography variant="body2" fontWeight={600} color="primary.main" gutterBottom>
                          Quota
                        </Typography>
                        <Typography variant="h4" fontWeight={700} color="primary.main">
                          {formData.leaveBalance.total}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total yearly quota
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'warning.50', height: '100%' }}>
                        <Typography variant="body2" fontWeight={600} color="warning.main" gutterBottom>
                          Carry Forward
                        </Typography>
                        <Typography variant="h4" fontWeight={700} color="warning.main">
                          {formData.leaveBalance.carryForward}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          From previous months
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'secondary.50', height: '100%' }}>
                        <Typography variant="body2" fontWeight={600} color="secondary.main" gutterBottom>
                          Used
                        </Typography>
                        <Typography variant="h4" fontWeight={700} color="secondary.main">
                          {formData.leaveBalance.taken}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Valid leaves taken
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: formData.leaveBalance.remaining > 0 ? 'success.50' : 'error.50', height: '100%' }}>
                        <Typography 
                          variant="body2" 
                          fontWeight={600} 
                          color={formData.leaveBalance.remaining > 0 ? 'success.main' : 'error.main'} 
                          gutterBottom
                        >
                          Available
                        </Typography>
                        <Typography 
                          variant="h4" 
                          fontWeight={700} 
                          color={formData.leaveBalance.remaining > 0 ? 'success.main' : 'error.main'}
                        >
                          {formData.leaveBalance.totalAvailable}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Quota + carry forward
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                  
                  {/* Monthly carry forward breakdown */}
                  {formData.leaveBalance.monthlyData && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        Monthly Carry Forward Breakdown:
                      </Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>Month</TableCell>
                              <TableCell align="center">Carry Forward</TableCell>
                              <TableCell align="center">Valid Leaves</TableCell>
                              <TableCell align="center">Balance</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.entries(formData.leaveBalance.monthlyData).map(([month, data]) => {
                              const monthName = new Date(selectedYear, parseInt(month) - 1).toLocaleString('default', { month: 'short' });
                              const isCurrentOrPast = parseInt(month) <= formData.leaveBalance.applicableMonth;
                              
                              return (
                                <TableRow 
                                  key={month}
                                  hover
                                  selected={parseInt(month) === formData.leaveBalance.applicableMonth}
                                  sx={{ 
                                    opacity: isCurrentOrPast ? 1 : 0.5,
                                    bgcolor: parseInt(month) === formData.leaveBalance.applicableMonth ? 'rgba(255, 235, 59, 0.1)' : 'inherit'
                                  }}
                                >
                                  <TableCell>{monthName}</TableCell>
                                  <TableCell align="center">
                                    <Chip 
                                      size="small"
                                      label={data.carryForward}
                                      color="primary"
                                      variant="outlined"
                                      sx={{ minWidth: 30 }}
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip 
                                      size="small"
                                      label={data.validLeaves}
                                      color={data.validLeaves > 0 ? "secondary" : "default"}
                                      variant={data.validLeaves > 0 ? "filled" : "outlined"}
                                      sx={{ minWidth: 30 }}
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip 
                                      size="small"
                                      label={data.unusedLeave}
                                      color={data.unusedLeave > 0 ? "success" : "default"}
                                      variant={data.unusedLeave > 0 ? "filled" : "outlined"}
                                      sx={{ minWidth: 30, fontWeight: 600 }}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      
                      <Alert 
                        severity={formData.leaveBalance.totalAvailable > 0 ? "success" : "warning"} 
                        icon={formData.leaveBalance.totalAvailable > 0 ? <CheckIcon /> : <WarningIcon />}
                        sx={{ mt: 2 }}
                      >
                        {formData.leaveBalance.totalAvailable > 0 ? (
                          <Typography variant="body2">
                            You have <strong>{formData.leaveBalance.totalAvailable} leaves</strong> available 
                            (including {formData.leaveBalance.carryForward} carried forward).
                          </Typography>
                        ) : (
                          <Typography variant="body2">
                            You have used all your leave quota for this year. This leave will be marked as Loss of Pay (LOP).
                          </Typography>
                        )}
                      </Alert>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
            
            {submitting && !formData.leaveBalance && formData.member_id && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </Box>
          
          <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              • You have a total of 12 paid leaves per year
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Unused leaves are carried forward to subsequent months
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Additional leaves beyond your available balance are marked as Loss of Pay
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={submitting}
            startIcon={formData.leaveBalance && formData.leaveBalance.totalAvailable <= 0 ? <WarningIcon /> : null}
          >
            {submitting ? 'Submitting...' : (formData.leaveBalance && formData.leaveBalance.totalAvailable <= 0 ? 'Submit as LOP' : 'Submit')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
