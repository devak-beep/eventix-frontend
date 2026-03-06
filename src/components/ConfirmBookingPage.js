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

  const [showBackModal, setShowBackModal] = useState(false);
  const [backModalPending, setBackModalPending] = useState(false);

  const bookingConfirmedRef = useRef(false);

  const { eventId, seats, expiresAt, eventName, passType, selectedDate, passPrice, amount } =
    location.state || {};

  // ── Cleanup: cancel lock when navigating away (before confirm) ─────────────
  useEffect(() => {
    return () => {
      if (!bookingConfirmedRef.current && lockId) {
        const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/api";
        navigator.sendBeacon?.(
          `${API_BASE_URL}/locks/${lockId}/cancel`,
          new Blob([JSON.stringify({})], { type: "application/json" }),
        );
      }
    };
  }, [lockId]);

  // ── Browser back / reload prevention ───────────────────────────────────────
  useEffect(() => {
    const handlePopState = () => {
      if (lockId) {
        window.history.pushState(null, "", window.location.href);
        setShowBackModal(true);
      }
    };
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Your seat lock will be cancelled if you leave.";
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [lockId]);

  // ── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        setTimeRemaining(0);
        setError("Lock expired! Please start a new booking.");
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
      bookingConfirmedRef.current = true;

      if (!response.booking || !response.booking._id) {
        throw new Error(response.message || "Booking confirmation failed — please try again");
      }

      // Effective price per seat (from state passed by LockSeatsPage)
      const effectivePrice = passPrice ?? amount ?? 0;

      navigate(`/booking/payment/${response.booking._id}`, {
        state: {
          eventId,
          seats,
          eventName,
          passType:     passType || "regular",
          selectedDate: selectedDate || null,
          passPrice:    effectivePrice,
          // Legacy amount field — PaymentPage will get real amount from createOrder API
          amount:       effectivePrice,
          lockId,
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to confirm booking");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBack = async () => {
    setBackModalPending(true);
    try { await cancelLock(lockId); } catch {}
    setShowBackModal(false);
    setBackModalPending(false);
    navigate("/");
  };

  if (!eventName || !seats) return <ConfirmBookingSkeleton />;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const effectivePrice = passPrice ?? amount ?? 0;
  const totalAmount    = effectivePrice * (seats || 0);

  const passLabel = () => {
    if (!passType || passType === "regular") return null;
    if (passType === "daily") return `Day Pass — ${selectedDate ? formatDate(selectedDate) : ""}`;
    if (passType === "season") return "Season Pass (all days)";
    return null;
  };

  function formatDate(key) {
    return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    });
  }

  return (
    <div className="event-details">
      <button onClick={() => setShowBackModal(true)} className="back-btn">← Back</button>

      <div className="booking-section">
        <h3>Confirm Your Booking</h3>
        {error && <div className="error">{error}</div>}

        <div className="booking-step">
          <p>✅ Seats locked!</p>

          {eventName && <p><strong>Event:</strong> {eventName}</p>}

          {passLabel() && (
            <p><strong>Pass Type:</strong> {passLabel()}</p>
          )}

          <p><strong>Tickets:</strong> {seats}</p>

          <p><strong>Total Amount:</strong> ₹{totalAmount}</p>

          {timeRemaining > 0 && (
            <div className="timer-container">
              <div className="timer">
                ⏱️ Time remaining:{" "}
                <span className="timer-value">
                  {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, "0")}
                </span>
              </div>
              <div className="timer-bar">
                <div
                  className="timer-progress"
                  style={{ width: `${(timeRemaining / 600) * 100}%` }}
                />
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

      <ConfirmModal
        isOpen={showBackModal}
        onClose={() => setShowBackModal(false)}
        onConfirm={handleConfirmBack}
        title="Cancel Seat Lock?"
        message="Going back will cancel your seat lock and restore the seats. Are you sure?"
        confirmText="Yes, Go Back"
        cancelText="Stay Here"
        type="warning"
        loading={backModalPending}
      />
    </div>
  );
}

export default ConfirmBookingPage;
