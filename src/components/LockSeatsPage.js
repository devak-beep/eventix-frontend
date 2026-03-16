// Lock Seats Page — single-day and multi-day (daily/season pass) booking
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEventById, lockSeats, cancelLock } from "../api";
import { LockSeatsPageSkeleton } from "./SkeletonLoader";
import ConfirmModal from "./ConfirmModal";
import { v4 as uuidv4 } from "uuid";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build array of ISO date strings ["YYYY-MM-DD", ...] from start to end (inclusive). */
function buildDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/** Format a "YYYY-MM-DD" key for display */
function formatDateKey(key) {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

/** Given the dailySeats plain object from API, return { available, total } for a dateKey */
function getDaySeats(dailySeats, dateKey) {
  if (!dailySeats) return null;
  return dailySeats[dateKey] || null;
}

/** True if ALL dates in range have available >= seats */
function isSeasonPassAvailable(dailySeats, dateRange, seats) {
  return dateRange.every((key) => {
    const day = getDaySeats(dailySeats, key);
    return day && day.available >= seats;
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

function LockSeatsPage({ userId }) {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // Common booking state
  const [seats, setSeats]             = useState(1);
  const [lockCreated, setLockCreated] = useState(false);
  const [currentLockId, setCurrentLockId] = useState(null);

  // Multi-day state
  const [passType, setPassType]           = useState("regular"); // "regular"|"daily"|"season"
  const [selectedDate, setSelectedDate]   = useState("");
  const [dateRange, setDateRange]         = useState([]);

  // Modal
  const [showBackModal, setShowBackModal]     = useState(false);
  const [backModalPending, setBackModalPending] = useState(false);

  const isProcessingRef = useRef(false);

  const user   = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin" || user?.role === "superAdmin";

  // ── Load event ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchEventDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchEventDetails = async () => {
    setLoading(true);
    try {
      const response = await getEventById(eventId);
      const ev = response.data;
      setEvent(ev);

      // Set up multi-day defaults
      if (ev.eventType === "multi-day") {
        const range = buildDateRange(ev.eventDate, ev.endDate);
        setDateRange(range);

        const dailyEnabled  = ev.passOptions?.dailyPass?.enabled;
        const seasonEnabled = ev.passOptions?.seasonPass?.enabled;

        // Set default pass type based on what's enabled
        if (dailyEnabled && !seasonEnabled) {
          setPassType("daily");
          // Pre-select first available date
          const first = range.find((k) => getDaySeats(ev.dailySeats, k)?.available > 0);
          if (first) setSelectedDate(first);
        } else if (seasonEnabled && !dailyEnabled) {
          setPassType("season");
        } else if (dailyEnabled && seasonEnabled) {
          // Both available → default to daily
          setPassType("daily");
          const first = range.find((k) => getDaySeats(ev.dailySeats, k)?.available > 0);
          if (first) setSelectedDate(first);
        }
      } else {
        setPassType("regular");
      }
    } catch (err) {
      setError("Failed to load event details");
    } finally {
      setLoading(false);
    }
  };

  // ── Cleanup lock on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (currentLockId) {
        cancelLock(currentLockId).catch(() => {});
      }
    };
  }, [currentLockId]);

  // ── Back-button handling ────────────────────────────────────────────────────
  useEffect(() => {
    if (lockCreated && currentLockId) {
      const handlePopState = () => {
        window.history.pushState(null, "", window.location.href);
        setShowBackModal(true);
      };
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = "You have locked seats. If you leave, your lock will be cancelled.";
      };
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", handlePopState);
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => {
        window.removeEventListener("popstate", handlePopState);
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [lockCreated, currentLockId]);

  // ── Computed values ─────────────────────────────────────────────────────────
  const isMultiDay = event?.eventType === "multi-day";
  const dailyEnabled  = event?.passOptions?.dailyPass?.enabled;
  const seasonEnabled = event?.passOptions?.seasonPass?.enabled;
  const bothEnabled   = dailyEnabled && seasonEnabled;

  const dailyPrice  = event?.passOptions?.dailyPass?.price  || 0;
  const seasonPrice = event?.passOptions?.seasonPass?.price || 0;
  const regularPrice = event?.amount || 0;

  // Available seats for the selected context
  const getAvailableSeats = () => {
    if (!event) return 0;
    if (passType === "regular") return event.availableSeats;
    if (passType === "daily" && selectedDate) {
      return getDaySeats(event.dailySeats, selectedDate)?.available || 0;
    }
    if (passType === "season") {
      // Min available across all days
      if (!dateRange.length) return 0;
      return Math.min(...dateRange.map((k) => getDaySeats(event.dailySeats, k)?.available || 0));
    }
    return 0;
  };

  const pricePerSeat = passType === "daily" ? dailyPrice : passType === "season" ? seasonPrice : regularPrice;
  const totalAmount  = pricePerSeat * (seats || 0);
  const availableSeats = getAvailableSeats();

  const isSeasonSoldOut = isMultiDay && passType === "season" && !isSeasonPassAvailable(event?.dailySeats, dateRange, 1);

  // ── Validation ──────────────────────────────────────────────────────────────
  const canBook = () => {
    if (!seats || seats < 1) return false;
    if (seats > availableSeats) return false;
    if (passType === "daily" && !selectedDate) return false;
    if (passType === "season" && isSeasonSoldOut) return false;
    return true;
  };

  // ── Lock seats ──────────────────────────────────────────────────────────────
  const handleLockSeats = async () => {
    if (isProcessingRef.current) return;
    if (!userId) { setError("User ID missing. Please log out and log in again."); return; }

    isProcessingRef.current = true;
    setError("");
    setLoading(true);

    try {
      const idempotencyKey = uuidv4();
      const response = await lockSeats(
        eventId,
        seats,
        userId,
        idempotencyKey,
        passType,
        passType === "daily" ? selectedDate : null,
      );

      const lock = response.lock;
      if (!lock || !lock._id) throw new Error(response.message || "Seat lock failed — please try again");
      setLockCreated(true);
      setCurrentLockId(lock._id);

      navigate(`/booking/confirm/${lock._id}`, {
        state: {
          eventId,
          seats,
          expiresAt: lock.expiresAt,
          eventName: event.name,
          passType,
          selectedDate: passType === "daily" ? selectedDate : null,
          passPrice: pricePerSeat,
          // Legacy field for ConfirmBookingPage backward compat
          amount: pricePerSeat,
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to lock seats");
      isProcessingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    if (lockCreated && currentLockId) setShowBackModal(true);
    else navigate("/");
  };

  const handleConfirmBack = async () => {
    setBackModalPending(true);
    try { await cancelLock(currentLockId); } catch {}
    setShowBackModal(false);
    setBackModalPending(false);
    navigate("/");
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading && !event) return <LockSeatsPageSkeleton />;
  if (!event) return <div className="error">Event not found</div>;

  const expiryDate = event.eventType === "multi-day" && event.endDate
    ? new Date(new Date(event.endDate).setHours(23, 59, 59, 999))
    : new Date(event.eventDate);
  const isExpired  = expiryDate <= new Date();
  const isSoldOut  = !isMultiDay && event.availableSeats === 0;

  return (
    <div className="event-details">
      <button onClick={handleBackClick} className="back-btn">← Back to Events</button>

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
              <strong>📅 Date:</strong>{" "}
              {new Date(event.eventDate).toLocaleString("en-GB")}
              {isMultiDay && event.endDate && (
                <> &rarr; {new Date(event.endDate).toLocaleDateString("en-GB")}</>
              )}
            </p>
            {!isMultiDay && (
              <p><strong>🪑 Available Seats:</strong> {event.availableSeats} / {event.totalSeats}</p>
            )}
            {isMultiDay ? (
              <>
                <p><strong>🎟️ Event Type:</strong> Multi-Day</p>
                {dailyEnabled  && <p><strong>Day Pass:</strong> ₹{dailyPrice} per ticket</p>}
                {seasonEnabled && <p><strong>Season Pass:</strong> ₹{seasonPrice} per person (all {dateRange.length} days)</p>}
              </>
            ) : (
              <p><strong>💰 Price:</strong> ₹{regularPrice} per ticket</p>
            )}
            {event.createdBy && <p><strong>Organized by:</strong> {event.createdBy.name}</p>}
            {isAdmin && event.createdViaRequest && event.approvedBy && (
              <p><strong>Approved by:</strong> {event.approvedBy.name}</p>
            )}
          </div>
        </div>

        {/* ── Booking Section ── */}
        {isExpired ? (
          <div className="status-message-section expired-section">
            <div className="status-icon">⏰</div>
            <h3>Event Has Ended</h3>
            <p>Booking is no longer available.</p>
            <button onClick={() => navigate("/")} className="primary-btn">← Browse Upcoming Events</button>
          </div>
        ) : isSoldOut ? (
          <div className="status-message-section sold-out-section">
            <div className="status-icon">🎫</div>
            <h3>All Tickets Sold Out!</h3>
            <button onClick={() => navigate("/")} className="primary-btn">← Explore Other Events</button>
          </div>
        ) : (
          <div className="booking-section">
            <h3>Book Your Tickets</h3>
            {error && <div className="error">{error}</div>}

            {/* ── Pass Type Selector (multi-day with pass options) ── */}
            {isMultiDay && (dailyEnabled || seasonEnabled) && (
              <div className="pass-type-selector">
                <label className="pass-type-label">
                  {bothEnabled ? "Select Pass Type" : dailyEnabled ? "Day Pass" : "Season Pass"}
                </label>
                <div className="pass-type-tabs">
                  {dailyEnabled && (
                    <button
                      className={`pass-tab ${passType === "daily" ? "active" : ""}`}
                      onClick={() => { setPassType("daily"); setSeats(1); }}
                    >
                      <span className="pass-tab-icon">🎟️</span>
                      <span className="pass-tab-name">Day Pass</span>
                      <span className="pass-tab-price">₹{dailyPrice}</span>
                      <span className="pass-tab-desc">Attend one day</span>
                    </button>
                  )}
                  {seasonEnabled && (
                    <button
                      className={`pass-tab ${passType === "season" ? "active" : ""} ${isSeasonSoldOut ? "disabled" : ""}`}
                      onClick={() => { if (!isSeasonSoldOut) { setPassType("season"); setSeats(1); } }}
                      disabled={isSeasonSoldOut}
                    >
                      <span className="pass-tab-icon">🌟</span>
                      <span className="pass-tab-name">Season Pass</span>
                      <span className="pass-tab-price">₹{seasonPrice}</span>
                      <span className="pass-tab-desc">
                        {isSeasonSoldOut ? "Sold out" : `All ${dateRange.length} days`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Day Picker (daily pass) ── */}
            {isMultiDay && passType === "daily" && (
              <div className="day-picker">
                <label className="seat-label">Select Day</label>
                <div className="day-picker-grid">
                  {dateRange.map((key) => {
                    const day = getDaySeats(event.dailySeats, key);
                    const avail = day?.available || 0;
                    const total = day?.total || 0;
                    const soldOut = avail === 0;
                    const isSelected = selectedDate === key;
                    return (
                      <button
                        key={key}
                        className={`day-tile ${isSelected ? "selected" : ""} ${soldOut ? "sold-out" : ""}`}
                        onClick={() => { if (!soldOut) { setSelectedDate(key); setSeats(Math.min(seats, avail)); } }}
                        disabled={soldOut}
                      >
                        <span className="day-tile-date">{formatDateKey(key)}</span>
                        <span className={`day-tile-seats ${soldOut ? "sold-out-text" : avail <= 5 ? "low-seats" : ""}`}>
                          {soldOut ? "Sold out" : `${avail}/${total} left`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Season Pass Availability Summary ── */}
            {isMultiDay && passType === "season" && (
              <div className="season-summary">
                <label className="seat-label">Season Pass Coverage</label>
                <div className="season-days-grid">
                  {dateRange.map((key) => {
                    const day = getDaySeats(event.dailySeats, key);
                    const avail = day?.available || 0;
                    const soldOut = avail === 0;
                    return (
                      <div key={key} className={`season-day-chip ${soldOut ? "sold-out" : "available"}`}>
                        <span className="season-chip-icon">{soldOut ? "❌" : "✅"}</span>
                        <span className="season-chip-date">{formatDateKey(key)}</span>
                        {!soldOut && <span className="season-chip-seats">{avail} left</span>}
                      </div>
                    );
                  })}
                </div>
                {isSeasonSoldOut && (
                  <p className="season-sold-out-msg">⚠️ Season pass is unavailable because one or more days are sold out.</p>
                )}
              </div>
            )}

            {/* ── Seat Stepper ── */}
            {(!isMultiDay || (passType === "daily" && selectedDate) || (passType === "season" && !isSeasonSoldOut)) && (
              <div className="booking-step">
                <div className="seat-selector">
                  <label className="seat-label">
                    {isMultiDay && passType === "season" ? "Number of Season Passes" : "Select Tickets"}
                  </label>
                  <div className="seat-stepper">
                    <button
                      type="button"
                      className="stepper-btn stepper-minus"
                      onClick={() => setSeats(Math.max(1, seats - 1))}
                      disabled={seats <= 1}
                      aria-label="Decrease"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
                        if (val === "") { setSeats(""); return; }
                        const num = parseInt(val, 10);
                        if (!isNaN(num) && num >= 0) setSeats(Math.min(num, availableSeats));
                      }}
                      onBlur={(e) => {
                        const num = parseInt(e.target.value, 10);
                        if (isNaN(num) || num < 1) setSeats(1);
                        else if (num > availableSeats) setSeats(availableSeats);
                      }}
                    />
                    <button
                      type="button"
                      className="stepper-btn stepper-plus"
                      onClick={() => setSeats(Math.min(availableSeats, seats + 1))}
                      disabled={seats >= availableSeats}
                      aria-label="Increase"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>
                  <span className="seat-availability">{availableSeats} available</span>
                </div>

                <p className="total-amount">Total: ₹{totalAmount}</p>

                <button
                  onClick={handleLockSeats}
                  disabled={loading || !canBook()}
                >
                  {loading ? "Processing..." : "Book Tickets"}
                </button>
              </div>
            )}
          </div>
        )}
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

export default LockSeatsPage;
