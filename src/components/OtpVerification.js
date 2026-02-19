// OTP Verification Component
// Used after registration and login to verify the user's email
import React, { useState, useRef, useEffect } from "react";

const RESEND_COOLDOWN = 120; // 2 minutes in seconds
const OTP_EXPIRY = 120; // OTP valid for 2 minutes (displayed to user)

function OtpVerification({ email, purpose, onVerified, onResend, onBack }) {
  // 6 individual OTP digit inputs
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);

  // OTP expiry timer (counts down from 2 minutes, shows when OTP has expired)
  const [otpExpiry, setOtpExpiry] = useState(OTP_EXPIRY);
  const [otpExpired, setOtpExpired] = useState(false);

  const inputRefs = useRef([]);

  // Format seconds as MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // OTP expiry countdown
  useEffect(() => {
    if (otpExpiry <= 0) {
      setOtpExpired(true);
      return;
    }
    const timer = setTimeout(() => setOtpExpiry((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpExpiry]);

  // Handle digit input
  const handleChange = (index, value) => {
    // Only allow single digit
    if (value.length > 1) {
      value = value.slice(-1);
    }
    if (!/^\d*$/.test(value)) return; // Only numbers

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste — fill all boxes at once
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  // Handle backspace — go back to previous input
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Submit OTP
  const handleVerify = async () => {
    const otpString = otp.join("");
    if (otpString.length < 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onVerified(otpString);
    } catch (err) {
      setError(err.message || "Incorrect OTP. Please try again.");
      // Clear OTP and focus first input
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      await onResend();
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setResendCooldown(RESEND_COOLDOWN);
      setOtpExpiry(OTP_EXPIRY);
      setOtpExpired(false);
    } catch (err) {
      setError(err.message || "Failed to resend OTP. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const isComplete = otp.every((d) => d !== "");

  return (
    <div className="otp-container">
      <div className="otp-box">
        {/* Icon */}
        <div className="otp-icon">📧</div>

        {/* Title */}
        <h2 className="otp-title">Check Your Email</h2>
        <p className="otp-subtitle">We sent a 6-digit OTP to</p>
        <p className="otp-email">{email}</p>

        {/* OTP Expiry Timer */}
        {!otpExpired ? (
          <div
            className={`otp-timer ${otpExpiry <= 30 ? "otp-timer-urgent" : ""}`}
          >
            ⏱️ OTP expires in <strong>{formatTime(otpExpiry)}</strong>
          </div>
        ) : (
          <div className="otp-timer otp-timer-expired">
            ❌ OTP has expired — please resend a new one
          </div>
        )}

        {/* Error */}
        {error && <div className="otp-error">{error}</div>}

        {/* OTP Input Boxes */}
        <div className="otp-inputs" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`otp-input ${digit ? "otp-input-filled" : ""} ${otpExpired ? "otp-input-disabled" : ""}`}
              disabled={otpExpired}
            />
          ))}
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={loading || !isComplete || otpExpired}
          className="otp-verify-btn"
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        {/* Resend */}
        <div className="otp-resend">
          <span>Didn't receive the code? </span>
          {resendCooldown > 0 ? (
            <span className="otp-cooldown">Resend in {resendCooldown}s</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="otp-resend-btn"
            >
              {resending ? "Sending..." : "Resend OTP"}
            </button>
          )}
        </div>

        {/* Back */}
        <button onClick={onBack} className="otp-back-btn">
          ← Back
        </button>
      </div>
    </div>
  );
}

export default OtpVerification;
