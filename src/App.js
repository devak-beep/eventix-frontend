// This is the main App component - the starting point of our frontend
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import Login from "./components/Login";
import Register from "./components/Register";
import EventList from "./components/EventList";
import LockSeatsPage from "./components/LockSeatsPage";
import ConfirmBookingPage from "./components/ConfirmBookingPage";
import BookingResultPage from "./components/BookingResultPage";
import PaymentPage from "./components/PaymentPage";
import BookingSuccessPage from "./components/BookingSuccessPage";
import MyBookings from "./components/MyBookings";
import CreateEvent from "./components/CreateEvent";
import { EventixLogoSimple } from "./components/EventixLogo";
import { getUserById } from "./api";

// Navigation bar component
function Navbar({ user, onLogout, isDarkMode, onToggleTheme }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      onLogout();
      setMenuOpen(false);
    }
  };

  // Get user initials for avatar
  const getUserInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleNavClick = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div
        onClick={() => navigate("/")}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <EventixLogoSimple width={40} height={40} />
        <h1>Eventix</h1>
      </div>
      <div className="nav-links">
        <button
          onClick={onToggleTheme}
          className="theme-toggle-btn"
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? "☀️" : "🌙"}
        </button>
        <div className="user-menu-wrapper">
          <button
            className="user-avatar-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            title={`${user.name} ${user.role === "admin" ? "(Admin)" : user.role === "superAdmin" ? "(SuperAdmin)" : ""}`}
          >
            <span className="avatar">{getUserInitials(user.name)}</span>
            <span className="dropdown-arrow">▼</span>
          </button>
          {menuOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <div className="dropdown-user-name">{user.name}</div>
                <div className="dropdown-user-role">
                  {user.role === "admin" && "Admin"}
                  {user.role === "superAdmin" && "SuperAdmin"}
                  {!user.role && "User"}
                </div>
              </div>
              <div className="dropdown-items-wrapper">
                <button
                  className="dropdown-item"
                  onClick={() => handleNavClick("/")}
                >
                  📋 All Events
                </button>
                {(user.role === "admin" || user.role === "superAdmin") && (
                  <button
                    className="dropdown-item"
                    onClick={() => handleNavClick("/create")}
                  >
                    ➕ Create Event
                  </button>
                )}
                <button
                  className="dropdown-item"
                  onClick={() => handleNavClick("/bookings")}
                >
                  📊 My Dashboard
                </button>
                <hr className="dropdown-divider" />
                <button className="dropdown-item logout" onClick={handleLogout}>
                  🚪 Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  // State to track logged-in user
  const [user, setUser] = useState(null);

  // State to track which auth page to show (login or register)
  const [showRegister, setShowRegister] = useState(false);

  // State for theme (light or dark)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme === "dark";
    }
    // Default to system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Apply theme on mount and when isDarkMode changes
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (isDarkMode) {
      htmlElement.classList.add("dark");
      htmlElement.classList.remove("light");
      htmlElement.style.colorScheme = "dark";
    } else {
      htmlElement.classList.remove("dark");
      htmlElement.classList.add("light");
      htmlElement.style.colorScheme = "light";
    }
    // Save preference
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Check if user is already logged in (on page load)
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      console.log("User loaded from localStorage:", parsedUser);
      setUser(parsedUser);

      // Refresh user data from API to get latest role (in case user was promoted)
      getUserById(parsedUser._id)
        .then((response) => {
          const freshUser = response.data;
          console.log("Fresh user data from API:", freshUser);

          // Update state with fresh data
          setUser(freshUser);

          // Update localStorage if role changed
          if (freshUser.role !== parsedUser.role) {
            console.log(
              `User role updated: ${parsedUser.role} → ${freshUser.role}`,
            );
            localStorage.setItem("user", JSON.stringify(freshUser));
          }
        })
        .catch((err) => {
          console.error("Error refreshing user data:", err);
          // Keep the cached user if API fails
        });
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
    localStorage.removeItem("user");
    setUser(null);
  };

  // If user is not logged in, show login/register page
  if (!user) {
    return showRegister ? (
      <Register onRegisterSuccess={handleRegisterSuccess} />
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
        <Navbar
          user={user}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          onToggleTheme={handleToggleTheme}
        />

        <div className="container">
          <Routes>
            <Route path="/" element={<EventList />} />
            <Route
              path="/event/:eventId"
              element={<LockSeatsPage userId={user._id} />}
            />
            <Route
              path="/booking/confirm/:lockId"
              element={<ConfirmBookingPage />}
            />
            <Route
              path="/booking/payment/:bookingId"
              element={<PaymentPage />}
            />
            <Route path="/booking/success" element={<BookingSuccessPage />} />
            <Route
              path="/booking/result/:bookingId"
              element={<BookingResultPage />}
            />
            <Route
              path="/bookings"
              element={<MyBookings userId={user._id} />}
            />
            <Route
              path="/create"
              element={
                user.role === "admin" || user.role === "superAdmin" ? (
                  <CreateEvent userId={user._id} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
