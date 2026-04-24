// Forgot Password — 2-step flow: enter email → OTP + new password
import React, { useState } from "react";
import { forgotPassword, resetPassword, resendOtp } from "../api";
import OtpVerification from "./OtpVerification";

function ForgotPassword({ onBack, onSuccess }) {
  const [step, setStep] = useState("email"); // "email" | "otp"
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // New password fields (shown inside OTP step)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

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

  const handleOtpVerified = async (otp) => {
    setPasswordError("");
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    if (newPassword !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }
    const response = await resetPassword({
      email: email.toLowerCase().trim(),
      otp,
      newPassword,
    });
    if (response.success) {
      onSuccess("Password reset successfully! Please log in with your new password.");
    } else {
      throw new Error(response.message || "Reset failed. Please try again.");
    }
  };

  const handleResendOtp = async () => {
    await resendOtp({ email: email.toLowerCase().trim(), purpose: "reset" });
  };

  if (step === "otp") {
    return (
      <div>
        {/* New password fields above OTP box */}
        <div className="auth-container">
          <div className="auth-box" style={{ marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "16px", color: "var(--text-primary)" }}>Set New Password</h3>
            <div className="form-group">
              <label>New Password:</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
                placeholder="Repeat new password"
              />
            </div>
            {passwordError && <div className="error">{passwordError}</div>}
          </div>
        </div>
        <OtpVerification
          email={email.toLowerCase().trim()}
          purpose="reset"
          onVerified={handleOtpVerified}
          onResend={handleResendOtp}
          onBack={() => setStep("email")}
        />
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
