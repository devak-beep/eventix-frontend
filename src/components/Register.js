// This component handles user registration
import React, { useState } from "react";
import { createUser, verifyRegisterOtp, resendOtp } from "../api";
import { EventixLogo } from "./EventixLogo";
import { FullScreenLogoSequence } from "./FullScreenLogoSequence";
import OtpVerification from "./OtpVerification";

function Register({ onRegisterSuccess, isDarkMode, onToggleTheme }) {
  // Form data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requestAdmin, setRequestAdmin] = useState(false); // New: request admin role

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);

  // OTP states
  const [showOtp, setShowOtp] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  // Check password match
  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (value.length >= password.length && value !== password) {
      setPasswordMatch(false);
    } else if (value === password) {
      setPasswordMatch(true);
    } else {
      setPasswordMatch(true);
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (confirmPassword && confirmPassword.length >= value.length) {
      setPasswordMatch(confirmPassword === value);
    }
  };

  // Validate form data
  const validateForm = () => {
    // Name validation - at least 3 characters
    if (name.trim().length < 3) {
      setError("Name must be at least 3 characters long");
      return false;
    }

    // Email validation - must contain @ and .
    const emailLower = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      setError("Please enter a valid email address");
      return false;
    }

    // Password validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      setError("Password must contain at least one number");
      return false;
    }

    // Check for at least one special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setError(
        "Password must contain at least one special character (!@#$%^&* etc.)",
      );
      return false;
    }

    // Check password match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  // Handle registration
  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");

    // Validate form before submitting
    if (!validateForm()) {
      return;
    }

    // IDEMPOTENCY: Prevent double submission while request is in progress
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      // Create user in backend with normalized email
      const response = await createUser({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        requestAdmin, // Send admin request flag
      });

      // Backend now sends OTP — show the OTP screen
      if (response.requiresOtp) {
        setPendingEmail(email.toLowerCase().trim());
        setShowOtp(true);
      } else {
        // Fallback: backend didn't require OTP (shouldn't happen)
        setShowSuccess(true);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Registration failed";
      const isAlreadyRequested = err.response?.data?.isAlreadyRequested;

      if (isAlreadyRequested) {
        // User already has a pending request - show warning
        setError(`⚠️ ${errorMessage}`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle going to login after success
  const goToLogin = () => {
    setShowAnimation(true);
  };

  // OTP verified — user/admin created on backend, show success
  const handleOtpVerified = async (otpCode) => {
    const response = await verifyRegisterOtp({
      email: pendingEmail,
      otp: otpCode,
    });
    if (response.success) {
      setShowOtp(false);
      setShowSuccess(true);
    } else {
      throw new Error(response.message || "OTP verification failed");
    }
  };

  // Resend OTP during registration
  const handleResendOtp = async () => {
    await resendOtp({ email: pendingEmail, purpose: "register" });
  };

  return (
    <>
      {showAnimation && (
        <FullScreenLogoSequence onComplete={() => onRegisterSuccess(null)} />
      )}

      {/* OTP Verification Screen */}
      {showOtp ? (
        <OtpVerification
          email={pendingEmail}
          purpose="register"
          onVerified={handleOtpVerified}
          onResend={handleResendOtp}
          onBack={() => setShowOtp(false)}
        />
      ) : (
        <div className="auth-container">
          <button
            className="auth-theme-toggle"
            onClick={onToggleTheme}
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
          <div className="auth-box">
            {/* Show success message after registration */}
            {showSuccess ? (
              <div className="success-popup">
                <div className="success-icon">🎉</div>
                <h2>
                  {requestAdmin
                    ? "Admin Request Submitted!"
                    : "Congratulations!"}
                </h2>
                {requestAdmin ? (
                  <>
                    <p>Your request to become an admin has been submitted.</p>
                    <p>
                      Your account will be created once approved by a super
                      admin.
                    </p>
                    <p className="admin-request-info">
                      ⏳ Waiting for approval...
                    </p>
                  </>
                ) : (
                  <>
                    <p>You have registered successfully!</p>
                    <p>Now you can login with your credentials.</p>
                  </>
                )}
                <button onClick={goToLogin} className="submit-btn">
                  {requestAdmin ? "Back to Login" : "Go to Login"}
                </button>
              </div>
            ) : (
              <>
                <div className="auth-logo">
                  <EventixLogo width={80} height={80} />
                  <h1>Eventix</h1>
                  <p>Enterprise Event Management Platform</p>
                </div>
                <h2>Create Account</h2>

                {error && <div className="error">{error}</div>}

                <form onSubmit={handleRegister}>
                  <div className="form-group">
                    <label>Name:</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="John Doe"
                    />
                    <small>At least 3 characters</small>
                  </div>

                  <div className="form-group">
                    <label>Email:</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="john@example.com"
                    />
                    <small>Must be a valid email address</small>
                  </div>

                  <div className="form-group">
                    <label>Password:</label>
                    <input
                      type="password"
                      value={password}
                      onChange={handlePasswordChange}
                      required
                      placeholder="Enter password"
                    />
                    <small>
                      Min 6 characters, 1 number, 1 special character (!@#$%^&*)
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Confirm Password:</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={handleConfirmPasswordChange}
                      required
                      placeholder="Re-enter password"
                      style={{ borderColor: !passwordMatch ? "#ef4444" : "" }}
                    />
                    {!passwordMatch && confirmPassword && (
                      <small style={{ color: "#ef4444", fontWeight: 600 }}>
                        ⚠️ Passwords do not match
                      </small>
                    )}
                  </div>

                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={requestAdmin}
                        onChange={(e) => setRequestAdmin(e.target.checked)}
                        className="checkbox-input"
                      />
                      <span>
                        Request Admin Access to Create & Manage Events
                      </span>
                    </label>
                    <small>
                      {requestAdmin
                        ? "Your admin request will be reviewed by our team. You can book events immediately, and manage events once approved."
                        : "You can book events with your regular account. Upgrade to admin later from your dashboard."}
                    </small>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="submit-btn"
                  >
                    {loading ? "Creating Account..." : "Register"}
                  </button>
                </form>

                <p className="auth-switch">
                  Already have an account?
                  <button
                    onClick={() => onRegisterSuccess(null)}
                    className="link-btn"
                  >
                    Login here
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default Register;
