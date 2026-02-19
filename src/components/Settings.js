// Settings Page — allows user to configure their account preferences
import React, { useState } from "react";
import { updateOtpPreference } from "../api";

function Settings({ user, onUserUpdate }) {
  // OTP is enabled by default; user.otpEnabled is undefined for old users (treat as true)
  const [otpEnabled, setOtpEnabled] = useState(user.otpEnabled !== false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"

  const handleToggle = async () => {
    const newValue = !otpEnabled;
    setSaving(true);
    setMessage("");

    try {
      const response = await updateOtpPreference(user._id, newValue);

      // Update local state
      setOtpEnabled(newValue);

      // Update localStorage and notify parent
      const updatedUser = { ...user, otpEnabled: newValue };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      onUserUpdate(updatedUser);

      setMessage(response.message);
      setMessageType("success");
    } catch (err) {
      setMessage("Failed to save settings. Please try again.");
      setMessageType("error");
    } finally {
      setSaving(false);
      // Auto-clear message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-box">
        {/* Header */}
        <div className="settings-header">
          <div className="settings-header-icon">⚙️</div>
          <h2 className="settings-title">Settings</h2>
          <p className="settings-subtitle">Manage your account preferences</p>
        </div>

        {/* Security Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">🔐 Security</h3>

          {/* OTP Toggle */}
          <div className="settings-item">
            <div className="settings-item-info">
              <div className="settings-item-title">OTP Login Verification</div>
              <div className="settings-item-desc">
                {otpEnabled
                  ? "You'll receive a one-time password on your email every time you log in."
                  : "You can log in directly with just your email and password."}
              </div>
              <div
                className={`settings-item-status ${otpEnabled ? "status-on" : "status-off"}`}
              >
                {otpEnabled ? "🟢 More Secure" : "🟡 Less Secure"}
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              className={`settings-toggle ${otpEnabled ? "toggle-on" : "toggle-off"}`}
              onClick={handleToggle}
              disabled={saving}
              title={
                otpEnabled ? "Click to disable OTP" : "Click to enable OTP"
              }
            >
              <span className="toggle-knob" />
              <span className="toggle-label">{otpEnabled ? "ON" : "OFF"}</span>
            </button>
          </div>

          {/* Save feedback message */}
          {message && (
            <div className={`settings-message settings-message-${messageType}`}>
              {messageType === "success" ? "✅" : "❌"} {message}
            </div>
          )}
        </div>

        {/* Account Info Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">👤 Account</h3>
          <div className="settings-account-info">
            <div className="settings-account-row">
              <span className="settings-account-label">Name</span>
              <span className="settings-account-value">{user.name}</span>
            </div>
            <div className="settings-account-row">
              <span className="settings-account-label">Email</span>
              <span className="settings-account-value">{user.email}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
