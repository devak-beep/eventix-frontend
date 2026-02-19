// This component handles user login
import React, { useState } from "react";
import { loginUser, verifyLoginOtp, resendOtp } from "../api";
import { EventixLogo } from "./EventixLogo";
import { FullScreenLogoSequence } from "./FullScreenLogoSequence";
import OtpVerification from "./OtpVerification";

function Login({ onLoginSuccess, onSwitchToRegister }) {
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
        localStorage.setItem("user", JSON.stringify(userData));
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
    const response = await verifyLoginOtp({
      email: pendingEmail,
      otp: otpCode,
    });
    if (response.success) {
      const userData = response.data;
      localStorage.setItem("user", JSON.stringify(userData));
      console.log("Login successful:", userData);
      setUser(userData);
      setShowOtp(false);
      setShowAnimation(true);
    } else {
      throw new Error(response.message || "OTP verification failed");
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

      {/* OTP Verification Screen */}
      {showOtp ? (
        <OtpVerification
          email={pendingEmail}
          purpose="login"
          onVerified={handleOtpVerified}
          onResend={handleResendOtp}
          onBack={() => setShowOtp(false)}
        />
      ) : (
        <div className="auth-container">
          <div className="auth-box">
            <div className="auth-logo">
              <EventixLogo width={80} height={80} />
              <h1>Eventix</h1>
              <p>Enterprise Event Management Platform</p>
            </div>
            <h2>Welcome Back!</h2>

            {error && <div className="error">{error}</div>}

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

            <p className="auth-switch">
              Don't have an account?
              <button onClick={onSwitchToRegister} className="link-btn">
                Register here
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default Login;
