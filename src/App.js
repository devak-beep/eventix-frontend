// This is the main App component - the starting point of our frontend
import React, { useState, useEffect, useRef } from "react";
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
import RequestEvent from "./components/RequestEvent";
import Settings from "./components/Settings";
import ConfirmModal from "./components/ConfirmModal";
import { EventixLogoSimple } from "./components/EventixLogo";
import { getUserById } from "./api";

// Navigation bar component
function Navbar({ user, onLogout, onUserUpdate, isDarkMode, onToggleTheme }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleLogoutClick = () => {
    setMenuOpen(false);
    setLogoutModalOpen(true);
  };

  const handleLogoutConfirm = () => {
    setLogoutModalOpen(false);
    onLogout();
  };

  const getUserInitials = (name) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getRoleLabel = (role) => {
    if (role === "admin") return "Admin";
    if (role === "superAdmin") return "Super Admin";
    return "User";
  };

  const handleNavClick = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <>
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
          <div className="user-menu-wrapper" ref={menuRef}>
            <button
              className={`user-avatar-btn ${menuOpen ? "active" : ""}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="avatar-circle">
                {getUserInitials(user.name)}
              </span>
              <span className="avatar-name">{user.name.split(" ")[0]}</span>
              <span className={`dropdown-arrow ${menuOpen ? "open" : ""}`}>
                ▼
              </span>
            </button>
            {menuOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <div className="dropdown-user-avatar-lg">
                    {getUserInitials(user.name)}
                  </div>
                  <div className="dropdown-header-info">
                    <div className="dropdown-user-name">{user.name}</div>
                    <div className="dropdown-user-email">
                      {user.email || ""}
                    </div>
                    <span className="dropdown-user-role">
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                </div>
                <div className="dropdown-items-wrapper">
                  <button
                    className="dropdown-item"
                    onClick={() => handleNavClick("/")}
                  >
                    <span className="di-icon">📋</span>
                    <span>All Events</span>
                  </button>
                  <div className="dropdown-item download-app-item">
                    <span className="di-icon">📱</span>
                    <span>Download App</span>
                    <div className="download-submenu">
                      <a
                        className="download-option"
                        href="/eventix-react-native.apk"
                        download="Eventix.apk"
                      >
                        <span>⚛️</span> React Native APK
                      </a>
                      <a
                        className="download-option"
                        href="/eventix-kotlin.apk"
                        download="Eventix-Kotlin.apk"
                      >
                        <span>🤖</span> Kotlin APK
                      </a>
                    </div>
                  </div>
                  {(user.role === "admin" || user.role === "superAdmin") && (
                    <button
                      className="dropdown-item"
                      onClick={() => handleNavClick("/create")}
                    >
                      <span className="di-icon">➕</span>
                      <span>Create Event</span>
                    </button>
                  )}
                  {user.role === "user" && (
                    <button
                      className="dropdown-item"
                      onClick={() => handleNavClick("/request-event")}
                    >
                      <span className="di-icon">📝</span>
                      <span>Request Event</span>
                    </button>
                  )}
                  <button
                    className="dropdown-item"
                    onClick={() => handleNavClick("/bookings")}
                  >
                    <span className="di-icon">📊</span>
                    <span>Dashboard</span>
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => handleNavClick("/settings")}
                  >
                    <span className="di-icon">⚙️</span>
                    <span>Settings</span>
                  </button>
                </div>
                <div className="dropdown-footer">
                  <button
                    className="dropdown-item logout"
                    onClick={handleLogoutClick}
                  >
                    <span className="di-icon">🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Logout Confirmation Modal - rendered outside nav for proper centering */}
      <ConfirmModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
        title="Logout"
        message="Are you sure you want to logout? You will need to login again to access your account."
        confirmText="Logout"
        cancelText="Stay Logged In"
        type="logout"
      />
    </>
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
      <Register
        onRegisterSuccess={handleRegisterSuccess}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
      />
    ) : (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onSwitchToRegister={() => setShowRegister(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
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
          onUserUpdate={setUser}
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
              path="/settings"
              element={<Settings user={user} onUserUpdate={setUser} />}
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
            <Route
              path="/request-event"
              element={<RequestEvent userId={user._id} />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
