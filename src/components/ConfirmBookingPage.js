// Confirm Booking Page - Step 2 of booking
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { confirmBooking, cancelLock } from "../api";
import { ConfirmBookingSkeleton } from "./SkeletonLoader";
import ConfirmModal from "./ConfirmModal";

function ConfirmBookingPage() {
  const { lockId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Modal state for back navigation
  const [showBackModal, setShowBackModal] = useState(false);
  const [backModalPending, setBackModalPending] = useState(false);

  // Track if booking was confirmed (to prevent cleanup from cancelling)
  const bookingConfirmedRef = useRef(false);

  const { eventId, seats, expiresAt, eventName, amount } = location.state || {};

  // BUGFIX: Cancel lock when component unmounts (user navigates away via any link)
  useEffect(() => {
    return () => {
      // Only cancel if booking was NOT confirmed
      if (!bookingConfirmedRef.current && lockId) {
        // Use sendBeacon for reliable cleanup
        const API_BASE_URL =
          process.env.REACT_APP_API_URL || "http://localhost:3000/api";
        navigator.sendBeacon?.(
          `${API_BASE_URL}/locks/${lockId}/cancel`,
          new Blob([JSON.stringify({})], { type: "application/json" }),
        );
      }
    };
  }, [lockId]);

  // Handle browser back button and page close
  useEffect(() => {
    const handlePopState = (e) => {
      if (lockId) {
        // Push state back to prevent immediate navigation
        window.history.pushState(null, "", window.location.href);
        // Show custom modal instead of window.confirm
        setShowBackModal(true);
      }
    };

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Your seat lock will be cancelled if you leave.";
      return e.returnValue;
    };

    // Push current state to enable popstate detection
    window.history.pushState(null, "", window.location.href);

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [lockId]);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.floor((expiry - now) / 1000);

      if (remaining <= 0) {
        setTimeRemaining(0);
        setError("Lock expired! Please lock seats again.");
        clearInterval(interval);
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleConfirmBooking = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await confirmBooking(lockId);

      // BUGFIX: Mark booking as confirmed BEFORE navigating
      // This prevents cleanup effect from cancelling the lock
      bookingConfirmedRef.current = true;

      // Navigate to payment page
      navigate(`/booking/payment/${response.booking._id}`, {
        state: { eventId, seats, eventName, amount, lockId },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to confirm booking",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    // Show custom modal instead of window.confirm
    setShowBackModal(true);
  };

  // Handle confirmed back navigation
  const handleConfirmBack = async () => {
    setBackModalPending(true);
    try {
      await cancelLock(lockId);
    } catch (err) {
      console.error("Failed to cancel lock:", err);
    }
    setShowBackModal(false);
    setBackModalPending(false);
    navigate("/");
  };

  // Show loading skeleton if no data
  if (!eventName || !seats) {
    return <ConfirmBookingSkeleton />;
  }

  return (
    <div className="event-details">
      <button onClick={handleBackClick} className="back-btn">
        ← Back to Events
      </button>

      <div className="booking-section">
        <h3>Confirm Your Booking</h3>

        {error && <div className="error">{error}</div>}

        <div className="booking-step">
          <p>
            ✅ Seats locked! Lock ID: <code>{lockId}</code>
          </p>
          {eventName && (
            <p>
              <strong>Event:</strong> {eventName}
            </p>
          )}
          <p>
            <strong>Seats:</strong> {seats}
          </p>
          {amount !== undefined && (
            <p>
              <strong>Total Amount:</strong> ₹{amount * seats}
            </p>
          )}

          {timeRemaining > 0 && (
            <div className="timer-container">
              <div className="timer">
                ⏱️ Time remaining:{" "}
                <span className="timer-value">
                  {Math.floor(timeRemaining / 60)}:
                  {String(timeRemaining % 60).padStart(2, "0")}
                </span>
              </div>
              <div className="timer-bar">
                <div
                  className="timer-progress"
                  style={{ width: `${(timeRemaining / 300) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          <button
            onClick={handleConfirmBooking}
            disabled={loading || timeRemaining === 0}
          >
            {loading ? "Processing..." : "✔️ Confirm Booking"}
          </button>
        </div>
      </div>

      {/* Confirm Back Modal */}
      <ConfirmModal
        isOpen={showBackModal}
        onClose={() => setShowBackModal(false)}
        onConfirm={handleConfirmBack}
        title="Cancel Seat Lock?"
        message="Going back will cancel your seat lock and restore the seats. Are you sure you want to continue?"
        confirmText="Yes, Go Back"
        cancelText="Stay Here"
        type="warning"
        loading={backModalPending}
      />
    </div>
  );
}

export default ConfirmBookingPage;
