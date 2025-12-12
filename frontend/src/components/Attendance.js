import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRange, setDateRange] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  
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
      
      // Initialize attendance map for all students and all dates
      const initialMap = {};
      currentStudents.forEach(student => {
        if (!student || !student._id) return; // Skip invalid students
        
        dates.forEach(date => {
          const key = `${student._id}_${date}`;
          // Check if attendance already exists
          const existing = attendance.find(a => {
            if (!a || !a.student) return false;
            const studentId = typeof a.student === 'object' ? a.student._id : a.student;
            const recordDate = new Date(a.date).toISOString().split('T')[0];
            return studentId === student._id && recordDate === date;
          });
          // Set Sunday as leave by default, otherwise use existing or present
          if (isSunday(date)) {
            initialMap[key] = existing ? existing.status : 'leave';
          } else {
            initialMap[key] = existing ? existing.status : 'present';
          }
        });
      });
      console.log('Attendance map initialized:', Object.keys(initialMap).length, 'entries');
      setAttendanceMap(initialMap);
      setShowModal(true);
      console.log('Modal should be visible now');
    } catch (error) {
      console.error('Error in handleGenerateDates:', error);
      alert('Error generating attendance sheet: ' + error.message);
    }
  };

  const handleStatusChange = (studentId, date, status) => {
    const key = `${studentId}_${date}`;
    setAttendanceMap(prev => ({
      ...prev,
      [key]: status
    }));
  };

  const handleBulkSubmit = async () => {
    try {
      const promises = [];
      
      Object.entries(attendanceMap).forEach(([key, status]) => {
        const [studentId, date] = key.split('_');
        
        // Find existing record
        const existing = attendance.find(a => {
          const sid = typeof a.student === 'object' ? a.student._id : a.student;
          const recordDate = new Date(a.date).toISOString().split('T')[0];
          return sid === studentId && recordDate === date;
        });
        
        if (existing) {
          // Update existing record
          promises.push(
            axios.put(`${API_URL}/attendence/${existing._id}`, {
              student: studentId,
              date: date,
              status: status
            })
          );
        } else {
          // Create new record
          promises.push(
            axios.post(`${API_URL}/attendence`, {
              student: studentId,
              date: date,
              status: status
            })
          );
        }
      });
      
      await Promise.all(promises);
      setShowModal(false);
      fetchAttendance();
      alert('Attendance saved successfully for all students and dates!');
    } catch (err) {
      console.error('Error saving attendance:', err);
      alert(err.response?.data?.message || 'Error saving attendance.');
    }
  };

  // const handleDelete = async (id) => {
  //   if (window.confirm('Are you sure you want to delete this attendance record?')) {
  //     try {
  //       await axios.delete(`${API_URL}/attendence/${id}`);
  //       fetchAttendance();
  //     } catch (err) {
  //       console.error('Error deleting attendance:', err);
  //     }
  //   }
  // };

  // const getStudentName = (studentId) => {
  //   if (!studentId) return 'Deleted Student';
  //   if (typeof studentId === 'object' && studentId !== null) {
  //     return studentId.name || 'Unknown';
  //   }
  //   const student = students.find(s => s._id === studentId);
  //   return student?.name || 'Deleted Student';
  // };

  // Group attendance by date
  const groupAttendanceByDate = () => {
    const grouped = {};
    attendance.forEach(record => {
      const date = new Date(record.date).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(record);
    });
    return grouped;
  };

  // Calculate attendance percentage for each student
  const calculateStudentStats = (studentId) => {
    const studentRecords = attendance.filter(record => {
      if (!record.student) return false;
      const sid = typeof record.student === 'object' ? record.student._id : record.student;
      return sid === studentId;
    });
    
    // Get total number of unique dates from all attendance records
    const allDates = new Set();
    attendance.forEach(record => {
      const date = new Date(record.date).toLocaleDateString();
      allDates.add(date);
    });
    const totalDays = allDates.size;
    
    // Count present
    const present = studentRecords.filter(r => r.status === 'present').length;
    
    // For newly added students or students with missing records:
    // Missing days are counted as "present" by default
    const recordedDays = studentRecords.length;
    const missingDays = totalDays - recordedDays;
    const totalPresent = present + missingDays;
    
    const percentage = totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(2) : 0;
    
    return { totalDays, present: totalPresent, percentage };
  };

  const attendanceByDate = groupAttendanceByDate();
  const dates = Object.keys(attendanceByDate).sort((a, b) => {
    const dateA = new Date(a.split('/').reverse().join('-'));
    const dateB = new Date(b.split('/').reverse().join('-'));
    return dateB - dateA; // Most recent first
  });

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
        
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                {students.map(student => {
                  const stats = calculateStudentStats(student._id);
                  return (
                    <th key={student._id}>
                      {student.name}
                      <br />
                      <small style={{ fontWeight: 'normal', fontSize: '0.85em' }}>
                        ({stats.present}/{stats.totalDays}) {stats.percentage}%
                      </small>
                    </th>
                  );
                })}
                {isTeacher && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {dates.length === 0 ? (
                <tr>
                  <td colSpan={students.length + (isTeacher ? 2 : 1)} className="empty-state">
                    <p>No attendance records found. Start marking attendance!</p>
                  </td>
                </tr>
              ) : (
                dates.map((date) => (
                  <tr key={date}>
                    <td><strong>{date}</strong></td>
                    {students.map(student => {
                      const record = attendanceByDate[date].find(r => {
                        if (!r.student) return false;
                        const studentId = typeof r.student === 'object' ? r.student._id : r.student;
                        return studentId === student._id;
                      });
                      return (
                        <td key={student._id} style={{ textAlign: 'center' }}>
                          {record ? (
                            isTeacher ? (
                              <select
                                value={record.status}
                                onChange={async (e) => {
                                  try {
                                    await axios.put(`${API_URL}/attendence/${record._id}`, {
                                      student: typeof record.student === 'object' ? record.student._id : record.student,
                                      date: record.date,
                                      status: e.target.value
                                    });
                                    // Refresh attendance data after update
                                    await fetchAttendance();
                                  } catch (err) {
                                    console.error('Error updating attendance:', err);
                                    alert('Error updating attendance');
                                  }
                                }}
                                style={{ 
                                  padding: '0.3rem', 
                                  borderRadius: '5px', 
                                  border: '1px solid #ddd',
                                  fontSize: '0.9rem',
                                  cursor: 'pointer',
                                  backgroundColor: record.status === 'present' ? '#d1fae5' : record.status === 'absent' ? '#fee2e2' : '#fef3c7'
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
                            )
                          ) : (
                            isTeacher ? (
                              <select
                                value="present"
                                onChange={async (e) => {
                                  try {
                                    // Get the date from this row
                                    const recordDate = attendanceByDate[date][0].date;
                                    await axios.post(`${API_URL}/attendence`, {
                                      student: student._id,
                                      date: recordDate,
                                      status: e.target.value
                                    });
                                    fetchAttendance();
                                  } catch (err) {
                                    console.error('Error creating attendance:', err);
                                    alert('Error creating attendance');
                                  }
                                }}
                                style={{ 
                                  padding: '0.3rem', 
                                  borderRadius: '5px', 
                                  border: '1px solid #ddd',
                                  fontSize: '0.9rem',
                                  cursor: 'pointer',
                                  backgroundColor: '#d1fae5'
                                }}
                              >
                                <option value="present">P</option>
                                <option value="absent">A</option>
                                <option value="leave">L</option>
                              </select>
                            ) : (
                              <span className="status-badge status-present">P</span>
                            )
                          )}
                        </td>
                      );
                    })}
                    {isTeacher && (
                      <td>
                        <button 
                          className="btn-edit" 
                          onClick={async () => {
                            // Set the date range to this specific date and generate attendance sheet
                            const recordDate = new Date(attendanceByDate[date][0].date);
                            const dateString = recordDate.toISOString().split('T')[0];
                            setStartDate(dateString);
                            setEndDate(dateString);
                            
                            // Directly generate attendance sheet for this date
                            const studentsResponse = await axios.get(`${API_URL}/student`);
                            const currentStudents = studentsResponse.data;
                            setStudents(currentStudents);
                            
                            const dates = [dateString];
                            setDateRange(dates);
                            
                            // Initialize attendance map for all students on this date
                            const initialMap = {};
                            currentStudents.forEach(student => {
                              const key = `${student._id}_${dateString}`;
                              const existing = attendance.find(a => {
                                const studentId = typeof a.student === 'object' ? a.student._id : a.student;
                                const recordDate = new Date(a.date).toISOString().split('T')[0];
                                return studentId === student._id && recordDate === dateString;
                              });
                              initialMap[key] = existing ? existing.status : (isSunday(dateString) ? 'leave' : 'present');
                            });
                            setAttendanceMap(initialMap);
                            setShowModal(true);
                          }}
                          style={{ marginRight: '0.5rem' }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn-delete" 
                          onClick={() => {
                            if (window.confirm(`Delete all attendance records for ${date}?`)) {
                              const recordsToDelete = attendanceByDate[date];
                              Promise.all(recordsToDelete.map(r => axios.delete(`${API_URL}/attendence/${r._id}`)))
                                .then(() => fetchAttendance())
                                .catch(err => console.error('Error deleting attendance:', err));
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '90%', width: '1000px' }}>
            <h3>Mark Attendance for All Students ({startDate} to {endDate})</h3>
            
            <div style={{ maxHeight: '500px', overflowY: 'auto', marginTop: '1rem' }}>
              <table style={{ width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.5rem', minWidth: '150px' }}>Student</th>
                    {dateRange.map(date => (
                      <th key={date} style={{ 
                        textAlign: 'center', 
                        padding: '0.5rem', 
                        minWidth: '100px',
                        background: isFutureDate(date) ? '#f3f4f6' : 'inherit'
                      }}>
                        {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {isSunday(date) && <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Sun</div>}
                        {isFutureDate(date) && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Future</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student._id}>
                      <td style={{ padding: '0.5rem', fontWeight: '500' }}>
                        {student.name}<br />
                        <small style={{ color: '#666' }}>({student.rollNo})</small>
                      </td>
                      {dateRange.map(date => {
                        const key = `${student._id}_${date}`;
                        const isDisabled = isFutureDate(date);
                        return (
                          <td key={date} style={{ 
                            textAlign: 'center', 
                            padding: '0.5rem',
                            background: isDisabled ? '#f3f4f6' : 'inherit'
                          }}>
                            <select
                              value={attendanceMap[key] || 'present'}
                              onChange={(e) => handleStatusChange(student._id, date, e.target.value)}
                              disabled={isDisabled}
                              style={{ 
                                padding: '0.3rem', 
                                borderRadius: '5px', 
                                border: '1px solid #ddd',
                                fontSize: '0.9rem',
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                background: isDisabled ? '#e5e7eb' : 'white',
                                color: isDisabled ? '#9ca3af' : 'inherit'
                              }}
                            >
                              <option value="present">P</option>
                              <option value="absent">A</option>
                              <option value="leave">L</option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="modal-buttons" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="btn-submit" onClick={handleBulkSubmit}>Submit All Attendance</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Attendance;
