// Lock Seats Page - Step 1 of booking
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEventById, lockSeats, cancelLock } from "../api";
import { LockSeatsPageSkeleton } from "./SkeletonLoader";
import { v4 as uuidv4 } from "uuid";

function LockSeatsPage({ userId }) {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lockCreated, setLockCreated] = useState(false);
  const [currentLockId, setCurrentLockId] = useState(null);

  useEffect(() => {
    fetchEventDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Warn user if they try to leave after locking seats
  useEffect(() => {
    if (lockCreated && currentLockId) {
      let isNavigating = false;

      const handlePopState = async (e) => {
        if (!isNavigating) {
          // Push state back to prevent immediate navigation
          window.history.pushState(null, "", window.location.href);

          if (
            window.confirm("Going back will cancel your seat lock. Continue?")
          ) {
            isNavigating = true;
            try {
              await cancelLock(currentLockId);
            } catch (err) {
              console.error("Failed to cancel lock:", err);
            }
            // Navigate using React Router instead of browser back
            navigate("/");
          }
        }
      };

      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue =
          "You have locked seats. If you leave, your lock will be cancelled.";
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
    }
  }, [lockCreated, currentLockId, navigate]);

  const fetchEventDetails = async () => {
    setLoading(true);
    try {
      const response = await getEventById(eventId);
      setEvent(response.data);
    } catch (err) {
      setError("Failed to load event details");
    } finally {
      setLoading(false);
    }
  };

  const handleLockSeats = async () => {
    if (!userId) {
      setError("User ID is missing. Please logout and login again.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const idempotencyKey = uuidv4();
      const response = await lockSeats(eventId, seats, userId, idempotencyKey);

      setLockCreated(true);
      setCurrentLockId(response.lockId);

      // Navigate to confirm booking page with lockId
      navigate(`/booking/confirm/${response.lockId}`, {
        state: {
          eventId,
          seats,
          expiresAt: response.expiresAt,
          eventName: event.name,
          amount: event.amount || 0,
        },
      });
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to lock seats",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = async () => {
    if (lockCreated && currentLockId) {
      if (
        window.confirm(
          "You have locked seats. Going back will cancel your lock and restore the seats. Continue?",
        )
      ) {
        try {
          await cancelLock(currentLockId);
          navigate("/");
        } catch (err) {
          console.error("Failed to cancel lock:", err);
          navigate("/");
        }
      }
    } else {
      navigate("/");
    }
  };

  if (loading && !event) {
    return <LockSeatsPageSkeleton />;
  }

  if (!event) {
    return <div className="error">Event not found</div>;
  }

  return (
    <div className="event-details">
      <button onClick={handleBackClick} className="back-btn">
        ← Back to Events
      </button>

      <div className="event-details-content">
        <div className="event-header">
          {event.image && (
            <div className="event-detail-image">
              <img src={event.image} alt={event.name} />
            </div>
          )}
          <h2>{event.name}</h2>
          <p className="description">{event.description}</p>
          <div className="event-meta">
            <p>
              <strong>Date:</strong>{" "}
              {new Date(event.eventDate).toLocaleString("en-GB")}
            </p>
            <p>
              <strong>Available Seats:</strong> {event.availableSeats} /{" "}
              {event.totalSeats}
            </p>
            <p>
              <strong>Price:</strong> ₹{event.amount || 0} per ticket
            </p>
          </div>
        </div>

        <div className="booking-section">
          <h3>Book Your Seats</h3>

          {error && <div className="error">{error}</div>}

          <div className="booking-step">
            <div className="seat-selector">
              <label className="seat-label">Select Tickets</label>
              <div className="seat-stepper">
                <button
                  type="button"
                  className="stepper-btn stepper-minus"
                  onClick={() => setSeats(Math.max(1, seats - 1))}
                  disabled={seats <= 1}
                  aria-label="Decrease seats"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="seat-input"
                  value={seats}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Allow empty string for typing
                    if (val === "") {
                      setSeats("");
                      return;
                    }
                    // Only allow numeric input
                    const num = parseInt(val, 10);
                    if (!isNaN(num) && num >= 0) {
                      setSeats(Math.min(num, event.availableSeats));
                    }
                  }}
                  onBlur={(e) => {
                    // On blur, ensure valid value
                    const num = parseInt(e.target.value, 10);
                    if (isNaN(num) || num < 1) {
                      setSeats(1);
                    } else if (num > event.availableSeats) {
                      setSeats(event.availableSeats);
                    }
                  }}
                />
                <button
                  type="button"
                  className="stepper-btn stepper-plus"
                  onClick={() =>
                    setSeats(Math.min(event.availableSeats, seats + 1))
                  }
                  disabled={seats >= event.availableSeats}
                  aria-label="Increase seats"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
              <span className="seat-availability">
                {event.availableSeats} tickets available
              </span>
            </div>
            <p className="total-amount">
              Total Amount: ₹{(event.amount || 0) * (seats || 0)}
            </p>
            <button
              onClick={handleLockSeats}
              disabled={
                loading || !seats || seats < 1 || seats > event.availableSeats
              }
            >
              {loading ? "Processing..." : "Book Seats"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LockSeatsPage;
