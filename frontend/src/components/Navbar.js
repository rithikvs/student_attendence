import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isLoggedIn = !!localStorage.getItem('token');
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  if (!isLoggedIn) return null;

  return (
    <div className="navbar">
      <h1>🎓 Attendance System</h1>
      <nav>
        {isTeacher && (
          <>
            <Link to="/students">Students</Link>
            <Link to="/attendance">Attendance</Link>
          </>
        )}
        {isStudent && (
          <Link to="/my-profile">My Profile</Link>
        )}
        <div className="user-info">
          <span>👤 {user?.username} ({user?.role})</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>
    </div>
  );
}

export default Navbar;
