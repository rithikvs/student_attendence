import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

function StudentProfile() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    rollNo: '',
    class: '',
    section: ''
  });

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (profile) {
      fetchMyAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/student`);
      const students = response.data;
      
      // Try to find student by matching email, username, or roll number
      let myProfile = students.find(s => {
        // Check if student email matches user email
        if (user.email && s.email === user.email) return true;
        // Check if username matches roll number
        if (s.rollNo === user.username) return true;
        // Check if username matches name (case insensitive)
        if (s.name.toLowerCase() === user.username?.toLowerCase()) return true;
        return false;
      });
      
      if (myProfile) {
        setProfile(myProfile);
        setFormData({
          name: myProfile.name,
          rollNo: myProfile.rollNo,
          class: myProfile.class,
          section: myProfile.section || ''
        });
      } else {
        // Pre-fill form with username for new profile creation
        setFormData({
          name: user.username || '',
          rollNo: user.username || '',
          class: '',
          section: ''
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchMyAttendance = async () => {
    try {
      const response = await axios.get(`${API_URL}/attendence`);
      const allAttendance = response.data;
      setAllAttendance(allAttendance);
      
      if (!profile) return;
      
      console.log('Profile ID:', profile._id);
      console.log('Total attendance records:', allAttendance.length);
      
      // Filter attendance for current student
      const myAttendance = allAttendance.filter(record => {
        let studentId;
        if (typeof record.student === 'object' && record.student !== null) {
          studentId = record.student._id;
        } else {
          studentId = record.student;
        }
        const matches = studentId?.toString() === profile._id?.toString();
        return matches;
      });
      
      console.log('My attendance records:', myAttendance.length);
      console.log('My attendance data:', myAttendance);
      
      setAttendance(myAttendance);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (profile) {
        await axios.put(`${API_URL}/student/${profile._id}`, formData);
      } else {
        await axios.post(`${API_URL}/student`, formData);
      }
      setShowEditModal(false);
      fetchProfile();
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error saving profile:', err);
      alert(err.response?.data?.message || 'Error saving profile');
    }
  };

  const calculateAttendanceStats = () => {
    // Get total number of unique dates from all attendance records
    const allDates = new Set();
    allAttendance.forEach(record => {
      const date = new Date(record.date).toLocaleDateString();
      allDates.add(date);
    });
    const totalDays = allDates.size;
    
    console.log('=== Calculating Stats for', profile?.name, '===');
    console.log('All dates in system:', allDates.size);
    console.log('My attendance records count:', attendance.length);
    
    // Count actual recorded attendance
    const present = attendance.filter(r => r.status === 'present').length;
    const recordedAbsent = attendance.filter(r => r.status === 'absent').length;
    const leave = attendance.filter(r => r.status === 'leave').length;
    
    console.log('Present:', present);
    console.log('Recorded Absent:', recordedAbsent);
    console.log('Leave:', leave);
    
    // Calculate missing days (days where no attendance record exists for this student)
    // Missing days are counted as "present" by default
    const recordedDays = present + recordedAbsent + leave;
    const missingDays = totalDays - recordedDays;
    const totalPresent = present + missingDays;
    
    console.log('Recorded days:', recordedDays);
    console.log('Missing days:', missingDays);
    console.log('Total Present (including missing):', totalPresent);
    
    // Calculate percentage: total present out of total days
    const percentage = totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(2) : 0;
    
    console.log('Percentage:', percentage);
    console.log('=== End Stats ===');
    
    return { totalDays, present: totalPresent, absent: recordedAbsent, leave, percentage };
  };

  const stats = calculateAttendanceStats();

  return (
    <div className="container">
      <div className="dashboard">
        <h2>📝 My Profile & Attendance</h2>
        
        {/* Profile Section */}
        <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '10px', marginBottom: '2rem' }}>
          <h3 style={{ color: '#667eea', marginBottom: '1rem' }}>Personal Details</h3>
          {profile ? (
            <div>
              <p><strong>Name:</strong> {profile.name}</p>
              <p><strong>Roll No:</strong> {profile.rollNo}</p>
              <p><strong>Class:</strong> {profile.class}</p>
              <p><strong>Section:</strong> {profile.section || '-'}</p>
              <button className="btn btn-success" onClick={() => setShowEditModal(true)} style={{ marginTop: '1rem' }}>
                Edit Profile
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: '#666', marginBottom: '1rem' }}>
                No profile found. Please create your profile to view attendance.
              </p>
              <button className="btn-add" onClick={() => setShowEditModal(true)} style={{ marginTop: '1rem' }}>
                Create Profile
              </button>
            </div>
          )}
        </div>

        {/* Attendance Stats */}
        <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '10px', marginBottom: '2rem' }}>
          <h3 style={{ color: '#667eea', marginBottom: '1rem' }}>Attendance Statistics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <h4 style={{ color: '#0d47a1', fontSize: '2rem', margin: 0 }}>{stats.totalDays}</h4>
              <p style={{ color: '#0d47a1', margin: '0.5rem 0 0 0' }}>Total Days</p>
            </div>
            <div style={{ background: '#d4edda', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <h4 style={{ color: '#155724', fontSize: '2rem', margin: 0 }}>{stats.present}</h4>
              <p style={{ color: '#155724', margin: '0.5rem 0 0 0' }}>Present</p>
            </div>
            <div style={{ background: '#f8d7da', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <h4 style={{ color: '#721c24', fontSize: '2rem', margin: 0 }}>{stats.absent}</h4>
              <p style={{ color: '#721c24', margin: '0.5rem 0 0 0' }}>Absent</p>
            </div>
            <div style={{ background: '#fff3cd', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <h4 style={{ color: '#856404', fontSize: '2rem', margin: 0 }}>{stats.leave}</h4>
              <p style={{ color: '#856404', margin: '0.5rem 0 0 0' }}>Leave</p>
            </div>
            <div style={{ background: '#d1ecf1', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <h4 style={{ color: '#0c5460', fontSize: '2rem', margin: 0 }}>{stats.percentage}%</h4>
              <p style={{ color: '#0c5460', margin: '0.5rem 0 0 0' }}>Percentage</p>
            </div>
          </div>
        </div>

        {/* Attendance Records */}
        <h3 style={{ color: '#667eea', marginBottom: '1rem' }}>My Attendance Records</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Get all unique dates from all attendance records
                const allDates = new Set();
                allAttendance.forEach(record => {
                  allDates.add(new Date(record.date).toLocaleDateString());
                });
                const sortedDates = Array.from(allDates).sort((a, b) => {
                  const dateA = new Date(a.split('/').reverse().join('-'));
                  const dateB = new Date(b.split('/').reverse().join('-'));
                  return dateB - dateA; // Most recent first
                });

                if (sortedDates.length === 0) {
                  return (
                    <tr>
                      <td colSpan="2" className="empty-state">
                        <p>No attendance records found.</p>
                      </td>
                    </tr>
                  );
                }

                return sortedDates.map((date, index) => {
                  // Find record for this student on this date
                  const record = attendance.find(r => 
                    new Date(r.date).toLocaleDateString() === date
                  );
                  // Default to 'present' if no record exists (newly added student)
                  const status = record ? record.status : 'present';
                  
                  return (
                    <tr key={index}>
                      <td>{date}</td>
                      <td>
                        <span className={`status-badge status-${status}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{profile ? 'Edit Profile' : 'Create Profile'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Roll No</label>
                <input
                  type="text"
                  name="rollNo"
                  value={formData.rollNo}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Class</label>
                <input
                  type="text"
                  name="class"
                  value={formData.class}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Section</label>
                <input
                  type="text"
                  name="section"
                  value={formData.section}
                  onChange={handleChange}
                />
              </div>
              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit">
                  {profile ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentProfile;
