import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Students from './components/Students';
import Attendance from './components/Attendance';
import StudentProfile from './components/StudentProfile';

function App() {
  const isLoggedIn = !!localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isTeacher = user.role === 'teacher';
  const isStudent = user.role === 'student';

  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/login" element={isLoggedIn ? <Navigate to={isStudent ? "/my-profile" : "/students"} /> : <Login />} />
          <Route path="/register" element={isLoggedIn ? <Navigate to={isStudent ? "/my-profile" : "/students"} /> : <Register />} />
          
          {/* Teacher Routes */}
          <Route path="/students" element={isLoggedIn && isTeacher ? <Students /> : <Navigate to="/login" />} />
          <Route path="/attendance" element={isLoggedIn && isTeacher ? <Attendance /> : <Navigate to="/login" />} />
          
          {/* Student Routes */}
          <Route path="/my-profile" element={isLoggedIn && isStudent ? <StudentProfile /> : <Navigate to="/login" />} />
          
          <Route path="/" element={<Navigate to={isLoggedIn ? (isStudent ? "/my-profile" : "/students") : "/login"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
