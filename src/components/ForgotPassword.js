// Forgot Password — 3-step flow: email → OTP → new password
import React, { useState } from "react";
import { forgotPassword, resetPassword, resendOtp } from "../api";
import OtpVerification from "./OtpVerification";

function ForgotPassword({ onBack, onSuccess }) {
  const [step, setStep] = useState("email"); // "email" | "otp" | "password"
  const [email, setEmail] = useState("");
  const [verifiedOtp, setVerifiedOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email.toLowerCase().trim());
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Called by OtpVerification with the entered OTP string
  const handleOtpVerified = async (otp) => {
    // Just store the OTP and move to password step — don't call backend yet
    setVerifiedOtp(otp);
    setStep("password");
  };

  const handleResendOtp = async () => {
    await resendOtp({ email: email.toLowerCase().trim(), purpose: "reset" });
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (!/\d/.test(newPassword)) {
      setError("Password must contain at least one number.");
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      setError("Password must contain at least one special character (!@#$%^&* etc.).");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await resetPassword({
        email: email.toLowerCase().trim(),
        otp: verifiedOtp,
        newPassword,
      });
      if (response.success) {
        onSuccess("Password reset successfully! Please log in with your new password.");
      } else {
        throw new Error(response.message || "Reset failed.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      // If OTP expired after moving to password step, go back to OTP
      if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("not found")) {
        setError("OTP expired. Please request a new one.");
        setStep("otp");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <OtpVerification
        email={email.toLowerCase().trim()}
        purpose="reset"
        onVerified={handleOtpVerified}
        onResend={handleResendOtp}
        onBack={() => setStep("email")}
      />
    );
  }

  if (step === "password") {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h2>Set New Password</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "20px", fontSize: "14px" }}>
            OTP verified! Enter your new password below.
          </p>

          {error && <div className="error">{error}</div>}

          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>New Password:</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="At least 6 characters"
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label>Confirm Password:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repeat new password"
              />
            </div>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Forgot Password</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "20px", fontSize: "14px" }}>
          Enter your registered email and we'll send you an OTP to reset your password.
        </p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSendOtp}>
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
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>

        <p className="auth-switch">
          <button onClick={onBack} className="link-btn">← Back to Login</button>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
