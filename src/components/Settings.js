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
          <div className="settings-header-icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
          <h2 className="settings-title">Account Settings</h2>
          <p className="settings-subtitle">
            Manage your security and account preferences
          </p>
        </div>

        {/* Account Info Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">
            <svg
              className="section-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Profile Information
          </h3>
          <div className="settings-account-info">
            <div className="settings-account-row">
              <span className="settings-account-label">Full Name</span>
              <span className="settings-account-value">{user.name}</span>
            </div>
            <div className="settings-account-row">
              <span className="settings-account-label">Email Address</span>
              <span className="settings-account-value">{user.email}</span>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">
            <svg
              className="section-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Security Settings
          </h3>

          {/* OTP Toggle */}
          <div className="settings-item">
            <div className="settings-item-info">
              <div className="settings-item-title">
                Two-Factor Authentication (OTP)
              </div>
              <div className="settings-item-desc">
                {otpEnabled
                  ? "A one-time password will be sent to your email for each login attempt."
                  : "Direct login with email and password only. No additional verification required."}
              </div>
              <div
                className={`settings-item-status ${otpEnabled ? "status-on" : "status-off"}`}
              >
                <span className="status-indicator"></span>
                {otpEnabled ? "Enhanced Security" : "Standard Security"}
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              className={`settings-toggle ${otpEnabled ? "toggle-on" : "toggle-off"}`}
              onClick={handleToggle}
              disabled={saving}
              aria-label={
                otpEnabled
                  ? "Disable two-factor authentication"
                  : "Enable two-factor authentication"
              }
            >
              <span className="toggle-knob" />
              <span className="toggle-label">{otpEnabled ? "ON" : "OFF"}</span>
            </button>
          </div>

          {/* Save feedback message */}
          {message && (
            <div className={`settings-message settings-message-${messageType}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
