// This is the main App component - the starting point of our frontend
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import EventList from './components/EventList';
import LockSeatsPage from './components/LockSeatsPage';
import ConfirmBookingPage from './components/ConfirmBookingPage';
import BookingResultPage from './components/BookingResultPage';
import MyBookings from './components/MyBookings';
import CreateEvent from './components/CreateEvent';
import { EventixLogoSimple } from './components/EventixLogo';

// Navigation bar component
function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <EventixLogoSimple width={40} height={40} />
        <h1>Eventix</h1>
      </div>
      <div className="nav-links">
        <span className="user-info">{user.name}</span>
        <button onClick={() => navigate('/')}>All Events</button>
        <button onClick={() => navigate('/create')}>Create Event</button>
        <button onClick={() => navigate('/bookings')}>My Dashboard</button>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>
    </nav>
  );
}

function App() {
  // State to track logged-in user
  const [user, setUser] = useState(null);
  
  // State to track which auth page to show (login or register)
  const [showRegister, setShowRegister] = useState(false);

  // Check if user is already logged in (on page load)
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Handle successful login
  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  // Handle successful registration
  const handleRegisterSuccess = (userData) => {
    if (userData) {
      setUser(userData);
    } else {
      // Switch to login
      setShowRegister(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  // If user is not logged in, show login/register page
  if (!user) {
    return showRegister ? (
      <Register 
        onRegisterSuccess={handleRegisterSuccess}
      />
    ) : (
      <Login 
        onLoginSuccess={handleLoginSuccess}
        onSwitchToRegister={() => setShowRegister(true)}
      />
    );
  }

  // If user is logged in, show main app with routing
  return (
    <Router>
      <div className="App">
        <Navbar user={user} onLogout={handleLogout} />
        
        <div className="container">
          <Routes>
            <Route path="/" element={<EventList />} />
            <Route path="/event/:eventId" element={<LockSeatsPage userId={user._id} />} />
            <Route path="/booking/confirm/:lockId" element={<ConfirmBookingPage />} />
            <Route path="/booking/result/:bookingId" element={<BookingResultPage />} />
            <Route path="/bookings" element={<MyBookings userId={user._id} />} />
            <Route path="/create" element={<CreateEvent userId={user._id} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
