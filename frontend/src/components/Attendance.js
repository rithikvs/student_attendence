import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRange, setDateRange] = useState([]);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isTeacher = user.role === 'teacher';

  useEffect(() => {
    fetchAttendance();
    fetchStudents();
  }, []);

  const fetchAttendance = async () => {
    try {
      const response = await axios.get(`${API_URL}/attendence`);
      setAttendance(response.data);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API_URL}/student`);
      setStudents(response.data);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const generateDateRange = (start, end) => {
    const dates = [];
    const currentDate = new Date(start + 'T00:00:00'); // Add time to ensure proper parsing
    const endDate = new Date(end + 'T00:00:00');
    
    // Ensure dates are valid
    if (isNaN(currentDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date format:', start, end);
      return dates;
    }
    
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      dates.push(dateString);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log('Date range generated from', start, 'to', end, ':', dates);
    return dates;
  };

  const isSunday = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.getDay() === 0; // 0 = Sunday
  };

  const isFutureDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  const handleGenerateDates = async () => {
    console.log('Generate button clicked');
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }
    
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Allow end date to be in future (for full month), but limit actual attendance to today
    if (start > today) {
      alert('Start date cannot be in the future!');
      return;
    }
    
    if (start > end) {
      alert('Start date must be before end date!');
      return;
    }
    
    try {
      console.log('Fetching students...');
      // Refresh students list to include newly added students
      const studentsResponse = await axios.get(`${API_URL}/student`);
      const currentStudents = studentsResponse.data.filter(s => s && s._id); // Filter out null/invalid students
      console.log('Students fetched:', currentStudents.length);
      setStudents(currentStudents);
      
      if (currentStudents.length === 0) {
        alert('No students found. Please add students first.');
        return;
      }
      
      console.log('Generating date range...');
      const dates = generateDateRange(startDate, endDate);
      console.log('Dates generated:', dates.length, dates);
      setDateRange(dates);
      
      alert('Attendance sheet generated! Dates up to today are editable.');
    } catch (error) {
      console.error('Error in handleGenerateDates:', error);
      alert('Error generating attendance sheet: ' + error.message);
    }
  };

  // Calculate attendance percentage for each student
  const calculateStudentStats = (studentId) => {
    const studentRecords = attendance.filter(record => {
      if (!record.student) return false;
      const sid = typeof record.student === 'object' ? record.student._id : record.student;
      return sid === studentId;
    });
    
    const totalDays = dateRange.length > 0 ? dateRange.length : attendance.length > 0 ? new Set(attendance.map(r => new Date(r.date).toLocaleDateString())).size : 0;
    const present = studentRecords.filter(r => r.status === 'present').length;
    const percentage = totalDays > 0 ? ((present / totalDays) * 100).toFixed(2) : 0;
    
    return { totalDays, present, percentage };
  };

  // Get status for a student on a specific date
  const getAttendanceStatus = (studentId, date) => {
    const record = attendance.find(a => {
      if (!a || !a.student) return false;
      const sid = typeof a.student === 'object' ? a.student._id : a.student;
      const recordDate = new Date(a.date).toISOString().split('T')[0];
      return sid === studentId && recordDate === date;
    });
    
    if (record) return record;
    
    // Default: Sunday = leave, otherwise present
    return { status: isSunday(date) ? 'leave' : 'present', _id: null };
  };

  // Update or create attendance
  const updateAttendance = async (studentId, date, status, recordId) => {
    try {
      if (recordId) {
        // Update existing
        await axios.put(`${API_URL}/attendence/${recordId}`, {
          student: studentId,
          date: date,
          status: status
        });
      } else {
        // Create new
        await axios.post(`${API_URL}/attendence`, {
          student: studentId,
          date: date,
          status: status
        });
      }
      await fetchAttendance();
    } catch (err) {
      console.error('Error updating attendance:', err);
      alert('Error updating attendance');
    }
  };

  return (
    <div className="container">
      <div className="dashboard">
        <h2>📋 Attendance Management</h2>
        
        {isTeacher && (
          <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#667eea', marginBottom: '1rem' }}>Mark Attendance for Date Range</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Select full month dates. You can only mark attendance up to today's date.
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
                <label>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
                <label>End Date (can be future for full month)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <button className="btn-add" onClick={handleGenerateDates} style={{ marginBottom: 0 }}>
                Generate Attendance Sheet
              </button>
            </div>
          </div>
        )}
        
        <div className="table-container" style={{ overflowX: 'auto' }}>
          {dateRange.length === 0 ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Please select a date range and click "Generate Attendance Sheet" to view the full month attendance.</p>
            </div>
          ) : (
            <table style={{ minWidth: '100%' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                <tr>
                  <th style={{ position: 'sticky', left: 0, background: 'white', zIndex: 11, minWidth: '150px' }}>
                    Student
                  </th>
                  {dateRange.map(date => (
                    <th key={date} style={{ 
                      textAlign: 'center', 
                      padding: '0.5rem', 
                      minWidth: '80px',
                      background: isFutureDate(date) ? '#f3f4f6' : 'white'
                    }}>
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <br />
                      {isSunday(date) && <small style={{ color: '#f59e0b' }}>Sun</small>}
                      {isFutureDate(date) && <small style={{ color: '#9ca3af' }}>Future</small>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const stats = calculateStudentStats(student._id);
                  return (
                    <tr key={student._id}>
                      <td style={{ 
                        position: 'sticky', 
                        left: 0, 
                        background: 'white', 
                        zIndex: 1, 
                        padding: '0.5rem',
                        fontWeight: '600'
                      }}>
                        {student.name}
                        <br />
                        <small style={{ color: '#666', fontWeight: 'normal' }}>
                          ({student.rollNo}) - {stats.present}/{stats.totalDays} ({stats.percentage}%)
                        </small>
                      </td>
                      {dateRange.map(date => {
                        const record = getAttendanceStatus(student._id, date);
                        const isDisabled = isFutureDate(date);
                        return (
                          <td key={date} style={{ 
                            textAlign: 'center', 
                            padding: '0.3rem',
                            background: isDisabled ? '#f3f4f6' : 'inherit'
                          }}>
                            {isTeacher ? (
                              <select
                                value={record.status}
                                onChange={(e) => updateAttendance(student._id, date, e.target.value, record._id)}
                                disabled={isDisabled}
                                style={{ 
                                  padding: '0.3rem', 
                                  borderRadius: '5px', 
                                  border: '1px solid #ddd',
                                  fontSize: '0.85rem',
                                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                                  background: isDisabled ? '#e5e7eb' : 
                                    record.status === 'present' ? '#d1fae5' : 
                                    record.status === 'absent' ? '#fee2e2' : '#fef3c7',
                                  color: isDisabled ? '#9ca3af' : 'inherit',
                                  width: '100%',
                                  fontWeight: '600'
                                }}
                              >
                                <option value="present">P</option>
                                <option value="absent">A</option>
                                <option value="leave">L</option>
                              </select>
                            ) : (
                              <span className={`status-badge status-${record.status}`}>
                                {record.status === 'present' ? 'P' : record.status === 'absent' ? 'A' : 'L'}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default Attendance;
