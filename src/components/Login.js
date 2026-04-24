// This component handles user login
import React, { useState } from "react";
import { loginUser, verifyLoginOtp, resendOtp } from "../api";
import { EventixLogo } from "./EventixLogo";
import { FullScreenLogoSequence } from "./FullScreenLogoSequence";
import OtpVerification from "./OtpVerification";
import ForgotPassword from "./ForgotPassword";

function Login({
  onLoginSuccess,
  onSwitchToRegister,
  isDarkMode,
  onToggleTheme,
}) {
  // Form data
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAnimation, setShowAnimation] = useState(false);
  const [user, setUser] = useState(null);

  // OTP states
  const [showOtp, setShowOtp] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Login with normalized email — backend now sends OTP
      const response = await loginUser({
        email: email.toLowerCase().trim(),
        password,
      });

      if (response.requiresOtp) {
        // Show OTP screen
        setPendingEmail(email.toLowerCase().trim());
        setShowOtp(true);
      } else {
        // Fallback (shouldn't happen with OTP enabled)
        const userData = response.data;
        setUser(userData);
        setUser(userData);
        setShowAnimation(true);
      }
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  // OTP verified — save user and continue
  const handleOtpVerified = async (otpCode) => {
    try {
      const response = await verifyLoginOtp({
        email: pendingEmail,
        otp: otpCode,
      });
      if (response.success) {
        const userData = response.data;
        setUser(userData);
        console.log("Login successful:", userData);
        setUser(userData);
        setShowOtp(false);
        setShowAnimation(true);
      } else {
        throw new Error(response.message || "OTP verification failed");
      }
    } catch (err) {
      // Extract meaningful error message
      const message = err.response?.data?.message || err.message;
      if (message.includes("expired") || message.includes("not found")) {
        throw new Error("OTP has expired. Please request a new one.");
      } else if (
        message.includes("Invalid OTP") ||
        message.includes("incorrect")
      ) {
        throw new Error("Invalid OTP. Please check and try again.");
      } else if (message.includes("400")) {
        throw new Error("OTP has expired. Please request a new one.");
      }
      throw new Error(message || "Verification failed. Please try again.");
    }
  };

  // Resend OTP during login
  const handleResendOtp = async () => {
    await resendOtp({ email: pendingEmail, purpose: "login" });
  };

  return (
    <>
      {showAnimation && (
        <FullScreenLogoSequence onComplete={() => onLoginSuccess(user)} />
      )}

      {/* Forgot Password Screen */}
      {showForgotPassword ? (
        <ForgotPassword
          onBack={() => { setShowForgotPassword(false); setSuccessMessage(""); }}
          onSuccess={(msg) => { setShowForgotPassword(false); setSuccessMessage(msg); }}
        />
      ) : showOtp ? (
        <OtpVerification
          email={pendingEmail}
          purpose="login"
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
            <div className="auth-logo">
              <EventixLogo width={80} height={80} />
              <h1>Eventix</h1>
              <p>Enterprise Event Management Platform</p>
            </div>
            <h2>Welcome Back!</h2>

            {error && <div className="error">{error}</div>}
            {successMessage && <div className="success" style={{ color: "var(--success, #22c55e)", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "14px" }}>{successMessage}</div>}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="john@example.com"
                />
              </div>

              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
              </div>

              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <p className="auth-switch" style={{ marginTop: "12px" }}>
              <button onClick={() => setShowForgotPassword(true)} className="link-btn">
                Forgot Password?
              </button>
            </p>

            <p className="auth-switch">
              Don't have an account?
              <button onClick={onSwitchToRegister} className="link-btn">
                Register here
              </button>
            </p>

            <div style={{ display: "flex", alignItems: "center", margin: "16px 0", gap: "10px" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border-color, #e2e8f0)" }} />
              <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>or</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border-color, #e2e8f0)" }} />
            </div>

            <a
              href={`${process.env.REACT_APP_API_URL?.replace("/api", "")}/api/auth/google`}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #dadce0",
                background: "#fff", color: "#3c4043", fontWeight: 600,
                fontSize: "14px", textDecoration: "none", cursor: "pointer",
              }}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="20" height="20" />
              Continue with Google
            </a>
          </div>
        </div>
      )}
    </>
  );
}

export default Login;
