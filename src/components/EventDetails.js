// This component shows details of a single event and allows booking
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getEventById,
  lockSeats,
  confirmBooking,
  processPayment,
} from "../api";
import { EventDetailsSkeleton } from "./SkeletonLoader";
import { v4 as uuidv4 } from "uuid";

function EventDetails({ userId }) {
  const { eventId } = useParams(); // Get eventId from URL
  const navigate = useNavigate();
  // State to store event details
  const [event, setEvent] = useState(null);

  // State for booking process
  const [seats, setSeats] = useState(1); // Number of seats user wants to book
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // State to track booking steps
  const [lockId, setLockId] = useState(null); // After locking seats
  const [bookingId, setBookingId] = useState(null); // After confirming booking
  const [lockExpiresAt, setLockExpiresAt] = useState(null); // Lock expiry time
  const [timeRemaining, setTimeRemaining] = useState(0); // Seconds remaining
  const [paymentComplete, setPaymentComplete] = useState(false); // Payment completed

  // Fetch event details when component loads
  useEffect(() => {
    fetchEventDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Countdown timer for seat lock
  useEffect(() => {
    if (!lockExpiresAt) return;

    // Update timer every second
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(lockExpiresAt).getTime();
      const remaining = Math.floor((expiry - now) / 1000);

      if (remaining <= 0) {
        // Lock expired
        setTimeRemaining(0);
        setLockId(null);
        setLockExpiresAt(null);
        setError("Lock expired! Please lock seats again.");
        clearInterval(interval);
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockExpiresAt]);

  // Function to get event data from backend
  const fetchEventDetails = async () => {
    setLoading(true);
    try {
      const response = await getEventById(eventId);
      setEvent(response.data);
    } catch (err) {
      setError("Failed to load event details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: Lock seats (reserve them temporarily)
  const handleLockSeats = async () => {
    // Debug: Check if userId is available
    console.log("User ID:", userId);

    if (!userId) {
      setError("User ID is missing. Please logout and login again.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Generate unique key to prevent duplicate bookings
      const idempotencyKey = uuidv4();

      console.log("Locking seats with:", {
        eventId,
        seats,
        userId,
        idempotencyKey,
      });

      // Call API to lock seats (userId comes from props)
      const response = await lockSeats(eventId, seats, userId, idempotencyKey);

      console.log("Lock response:", response);

      // Backend returns { success: true, lockId, expiresAt }
      setLockId(response.lockId);
      setLockExpiresAt(response.expiresAt);
      setSuccess(`✅ Seats locked! Lock ID: ${response.lockId}`);

      // Refresh event to show updated available seats
      fetchEventDetails();
    } catch (err) {
      console.error("Lock seats error:", err);
      console.error("Full error response:", err.response);
      setError(
        err.response?.data?.message || err.message || "Failed to lock seats",
      );
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Confirm booking (convert lock to booking)
  const handleConfirmBooking = async () => {
    if (!lockId) {
      setError("Please lock seats first");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Call API to confirm booking
      const response = await confirmBooking(lockId);

      console.log("Confirm booking response:", response);

      // Backend returns { success: true, booking }
      setBookingId(response.booking._id);
      setSuccess(`✅ Booking confirmed! Booking ID: ${response.booking._id}`);

      // Refresh event details
      fetchEventDetails();
    } catch (err) {
      console.error("Confirm booking error:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to confirm booking",
      );
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Process payment
  const handlePayment = async (status = "SUCCESS") => {
    if (!bookingId) {
      setError("Please confirm booking first");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Generate unique payment key
      const idempotencyKey = uuidv4();

      // Call API to process payment
      await processPayment(bookingId, {
        status, // Can be 'SUCCESS', 'FAILURE', or 'TIMEOUT'
        idempotencyKey,
      });

      if (status === "SUCCESS") {
        setSuccess(`✅ Payment successful! Your booking is complete.`);
        setPaymentComplete(true);
      } else if (status === "FAILURE") {
        setError(`❌ Payment failed! Seats have been restored.`);
        setPaymentComplete(true);
      } else {
        setSuccess(`⏱️ Payment timeout! This will be handled automatically.`);
        setPaymentComplete(true);
      }

      // Refresh event details
      fetchEventDetails();
    } catch (err) {
      setError(err.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  // Show loading message while fetching
  if (loading && !event) {
    return <EventDetailsSkeleton />;
  }

  // Show error if event not found
  if (!event) {
    return <div className="error">Event not found</div>;
  }

  // Check if event has expired or sold out
  const eventDate = new Date(event.eventDate);
  const now = new Date();
  const isExpired = eventDate <= now;
  const isSoldOut = event.availableSeats === 0;

  return (
    <div className="event-details">
      {/* Back button */}
      <button onClick={() => navigate("/")} className="back-btn">
        ← Back to Events
      </button>

      {/* Event information */}
      <div className="event-header">
        <h2>{event.name}</h2>
        <div className="status-badges">
          {isExpired && (
            <div className="status-badge expired">
              <span className="badge-icon">⏰</span>
              <span className="badge-text">Event Expired</span>
            </div>
          )}
          {!isExpired && isSoldOut && (
            <div className="status-badge sold-out">
              <span className="badge-icon">🎫</span>
              <span className="badge-text">Sold Out</span>
            </div>
          )}
        </div>
        <p className="description">{event.description}</p>
        <div className="event-meta">
          <p>📅 Date: {new Date(event.eventDate).toLocaleString()}</p>
          <p>
            🪑 Available Seats: {event.availableSeats} / {event.totalSeats}
          </p>
          <p>💰 Price: ₹{event.amount || 0} per ticket</p>
        </div>
      </div>

      {/* Show expired, sold out, or booking section */}
      {isExpired ? (
        <div className="status-message-section expired-section">
          <div className="status-icon">⏰</div>
          <h3>Event Has Ended</h3>
          <p>
            This event took place on{" "}
            {new Date(event.eventDate).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            . Booking is no longer available.
          </p>
          <button onClick={() => navigate("/")} className="primary-btn">
            ← Browse Upcoming Events
          </button>
        </div>
      ) : isSoldOut ? (
        <div className="status-message-section sold-out-section">
          <div className="status-icon">🎫</div>
          <h3>All Tickets Sold Out!</h3>
          <p>
            Unfortunately, all {event.totalSeats} tickets for this event have
            been booked. Check out other amazing events below.
          </p>
          <button onClick={() => navigate("/")} className="primary-btn">
            ← Explore Other Events
          </button>
        </div>
      ) : (
        <div className="booking-section">
          <h3>Book Your Seats</h3>

          {/* Show error or success messages */}
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          {/* Step 1: Select seats and lock */}
          {!lockId && (
            <div className="booking-step">
              <label>
                Number of seats:
                <input
                  type="number"
                  min="1"
                  max={event.availableSeats}
                  value={seats}
                  onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                />
              </label>
              <p className="total-amount">
                Total Amount: ₹{(event.amount || 0) * seats}
              </p>
              <button
                onClick={handleLockSeats}
                disabled={loading || seats < 1 || seats > event.availableSeats}
              >
                {loading ? "Processing..." : "🔒 Book Your Seats"}
              </button>
            </div>
          )}

          {/* Step 2: Confirm booking */}
          {lockId && !bookingId && (
            <div className="booking-step">
              <p>
                ✅ Seats locked! Lock ID: <code>{lockId}</code>
              </p>

              {/* Countdown timer */}
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

              <button onClick={handleConfirmBooking} disabled={loading}>
                {loading ? "Processing..." : "✔️ Confirm Booking"}
              </button>
            </div>
          )}

          {/* Step 3: Process payment */}
          {bookingId && !paymentComplete && (
            <div className="booking-step">
              <p>
                ✅ Booking confirmed! Booking ID: <code>{bookingId}</code>
              </p>
              <p>Choose payment option:</p>
              <div className="payment-buttons">
                <button
                  onClick={() => handlePayment("SUCCESS")}
                  disabled={loading}
                  className="success-btn"
                >
                  {loading ? "Processing..." : "💳 Pay Now (Success)"}
                </button>
                <button
                  onClick={() => handlePayment("FAILURE")}
                  disabled={loading}
                  className="failure-btn"
                >
                  {loading ? "Processing..." : "❌ Simulate Failure"}
                </button>
                <button
                  onClick={() => handlePayment("TIMEOUT")}
                  disabled={loading}
                  className="timeout-btn"
                >
                  {loading ? "Processing..." : "⏱️ Simulate Timeout"}
                </button>
              </div>
            </div>
          )}

          {/* Payment complete - show result and actions */}
          {paymentComplete && (
            <div
              className={`booking-step ${success ? "success-complete" : "failure-complete"}`}
            >
              <div className="result-icon">{success ? "🎉" : "❌"}</div>
              <h3>{success ? "Booking Complete!" : "Payment Failed"}</h3>
              <p>{success || error}</p>
              {bookingId && (
                <p>
                  Booking ID: <code>{bookingId}</code>
                </p>
              )}
              <div className="action-buttons">
                <button onClick={() => navigate("/")} className="primary-btn">
                  ← Back to Events
                </button>
                <button
                  onClick={() => navigate("/bookings")}
                  className="secondary-btn"
                >
                  View My Bookings
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EventDetails;
