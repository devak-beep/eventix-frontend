// Custom Confirmation Modal Component
// Replaces browser's default confirm() dialog with a styled modal

import React, { useEffect } from "react";

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger", // "danger" | "warning" | "info"
  loading = false,
}) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, loading, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "danger":
        return {
          iconBg: "rgba(239, 68, 68, 0.1)",
          iconColor: "#ef4444",
          buttonBg: "linear-gradient(135deg, #ef4444, #dc2626)",
          icon: (
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          ),
        };
      case "logout":
        return {
          iconBg: "rgba(239, 68, 68, 0.1)",
          iconColor: "#ef4444",
          buttonBg: "linear-gradient(135deg, #ef4444, #dc2626)",
          icon: (
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
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          ),
        };
      case "warning":
        return {
          iconBg: "rgba(245, 158, 11, 0.1)",
          iconColor: "#f59e0b",
          buttonBg: "linear-gradient(135deg, #f59e0b, #d97706)",
          icon: (
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ),
        };
      case "info":
      default:
        return {
          iconBg: "rgba(59, 130, 246, 0.1)",
          iconColor: "#3b82f6",
          buttonBg: "linear-gradient(135deg, #3b82f6, #2563eb)",
          icon: (
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          ),
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className="confirm-modal-overlay"
      onClick={loading ? undefined : onClose}
    >
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Icon */}
        <div
          className="confirm-modal-icon"
          style={{ background: styles.iconBg, color: styles.iconColor }}
        >
          {styles.icon}
        </div>

        {/* Title */}
        <h3 className="confirm-modal-title">{title}</h3>

        {/* Message */}
        <p className="confirm-modal-message">{message}</p>

        {/* Buttons */}
        <div className="confirm-modal-buttons">
          <button
            className="confirm-modal-btn cancel"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className="confirm-modal-btn confirm"
            onClick={onConfirm}
            disabled={loading}
            style={{ background: styles.buttonBg }}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
