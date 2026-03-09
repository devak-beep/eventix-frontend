// This component allows USERS to request event creation
// Unlike CreateEvent (admin only), this submits for approval
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CreateEventSkeleton } from "./SkeletonLoader";
import { v4 as uuidv4 } from "uuid";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";

// Platform fee for event creation (₹5000)
const PLATFORM_FEE = 5000;

function RequestEvent({ userId }) {
  const navigate = useNavigate();

  // Prevent double-clicks / duplicate submissions
  const isSubmittingRef = useRef(false);
  const [idempotencyKey] = useState(() => uuidv4());

  // State for event form
  const [eventData, setEventData] = useState({
    name:        "",
    description: "",
    eventDate:   "",
    endDate:     "",
    eventType:   "single-day",   // NEW: "single-day" | "multi-day"
    totalSeats:  10,
    type:        "public",
    category:    [],
    amount:      0,              // used only for single-day
    currency:    "INR",
    image:       null,
    passOptions: {               // used only for multi-day
      dailyPass:  { enabled: false, price: 0 },
      seasonPass: { enabled: false, price: 0 },
    },
  });

  // State for UI
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState("");
  const [success,           setSuccess]           = useState(false);
  const [showConfirmModal,  setShowConfirmModal]  = useState(false);

  // ─── Input handlers ────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEventData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEventTypeChange = (type) => {
    setEventData((prev) => ({ ...prev, eventType: type, endDate: "" }));
  };

  // Pass option: toggle enabled / change price
  const handlePassChange = (passKey, field, value) => {
    setEventData((prev) => ({
      ...prev,
      passOptions: {
        ...prev.passOptions,
        [passKey]: {
          ...prev.passOptions[passKey],
          [field]: field === "enabled" ? value : Number(value),
        },
      },
    }));
  };

  // Handle category checkbox changes
  const handleCategoryChange = (categoryValue) => {
    const multiSelectCategories = [
      "food-drink",
      "festivals-cultural",
      "dance-party",
    ];

    if (multiSelectCategories.includes(categoryValue)) {
      setEventData((prev) => {
        const filteredCategories = prev.category.filter((c) =>
          multiSelectCategories.includes(c),
        );
        return {
          ...prev,
          category: filteredCategories.includes(categoryValue)
            ? filteredCategories.filter((c) => c !== categoryValue)
            : [...filteredCategories, categoryValue],
        };
      });
    } else {
      setEventData((prev) => ({ ...prev, category: [categoryValue] }));
    }
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { setError("Image size must be less than 5MB"); return; }
      if (!file.type.startsWith("image/")) { setError("Please upload an image file"); return; }

      const reader = new FileReader();
      reader.onloadend = () => {
        processImageToCardRatio(reader.result)
          .then((processedImage) => {
            setEventData((prev) => ({ ...prev, image: processedImage }));
            setError("");
          })
          .catch(() => setError("Failed to process image"));
      };
      reader.readAsDataURL(file);
    }
  };

  // Card aspect ratio (16:9)
  const CARD_ASPECT_RATIO = 16 / 9;

  const processImageToCardRatio = (base64Image) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        const imgAspectRatio = width / height;

        if (Math.abs(imgAspectRatio - CARD_ASPECT_RATIO) / CARD_ASPECT_RATIO < 0.05) {
          resolve(base64Image);
          return;
        }

        let canvasWidth, canvasHeight;
        if (imgAspectRatio < CARD_ASPECT_RATIO) {
          canvasHeight = height;
          canvasWidth  = Math.round(height * CARD_ASPECT_RATIO);
        } else {
          canvasWidth  = width;
          canvasHeight = Math.round(width / CARD_ASPECT_RATIO);
        }

        const minWidth = 800;
        if (canvasWidth < minWidth) {
          const scale = minWidth / canvasWidth;
          canvasWidth  = minWidth;
          canvasHeight = Math.round(canvasHeight * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width  = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d");

        const blurRadius = Math.min(80, Math.max(40, Math.round(canvasWidth / 15)));

        const bgScale  = Math.max(canvasWidth / width, canvasHeight / height);
        const bgWidth  = width  * bgScale;
        const bgHeight = height * bgScale;
        ctx.filter = `blur(${blurRadius}px) brightness(0.85)`;
        ctx.drawImage(img, (canvasWidth - bgWidth) / 2, (canvasHeight - bgHeight) / 2, bgWidth, bgHeight);
        ctx.filter = "none";

        const fgScale  = Math.min(canvasWidth / width, canvasHeight / height);
        const fgWidth  = width  * fgScale;
        const fgHeight = height * fgScale;
        ctx.drawImage(img, (canvasWidth - fgWidth) / 2, (canvasHeight - fgHeight) / 2, fgWidth, fgHeight);

        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = base64Image;
    });
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const daysBetween = (start, end) =>
    Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;

  const fmtCurrency = (v) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(v);

  // ─── Validate ──────────────────────────────────────────────────────────────
  const validateForm = () => {
    if (!eventData.name.trim()) { setError("Event name is required"); return false; }
    if (!eventData.category || eventData.category.length === 0) {
      setError("Please select at least one category"); return false;
    }
    if (eventData.description.trim().length < 10) {
      setError("Description must be at least 10 characters long"); return false;
    }
    if (eventData.description.trim().length > 1500) {
      setError("Description must not exceed 1500 characters"); return false;
    }

    const selectedDate = new Date(eventData.eventDate);
    if (selectedDate <= new Date()) {
      setError("Event date and time must be in the future"); return false;
    }

    if (eventData.eventType === "multi-day") {
      if (!eventData.endDate) { setError("End date is required for multi-day events"); return false; }
      const endDate = new Date(eventData.endDate);
      if (endDate <= selectedDate) {
        setError("End date must be after the start date"); return false;
      }
      const { dailyPass, seasonPass } = eventData.passOptions;
      if (!dailyPass.enabled && !seasonPass.enabled) {
        setError("Enable at least one pass option (Day Pass or Season Pass)"); return false;
      }
      if (dailyPass.enabled && dailyPass.price < 0) {
        setError("Daily pass price cannot be negative"); return false;
      }
      if (seasonPass.enabled && seasonPass.price < 0) {
        setError("Season pass price cannot be negative"); return false;
      }
    }

    if (eventData.totalSeats < 1) { setError("Total seats must be at least 1"); return false; }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;
    setShowConfirmModal(true);
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const submitRequest = async () => {
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setLoading(true);
    setError("");
    setShowConfirmModal(false);

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      // Build payload - strip irrelevant fields per eventType
      const payload = {
        name:        eventData.name,
        description: eventData.description,
        eventDate:   eventData.eventDate,
        eventType:   eventData.eventType,
        totalSeats:  eventData.totalSeats,
        type:        eventData.type,
        category:    eventData.category,
        currency:    eventData.currency,
        image:       eventData.image,
        idempotencyKey,
      };

      if (eventData.eventType === "single-day") {
        payload.amount = eventData.amount;
      } else {
        payload.endDate     = eventData.endDate;
        payload.passOptions = eventData.passOptions;
      }

      const response = await fetch(`${API_BASE_URL}/event-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${user.token}`,
          "x-user-id":    user._id,
          "x-user-role":  user.role,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setEventData({
          name: "", description: "", eventDate: "", endDate: "",
          eventType: "single-day", totalSeats: 10, type: "public",
          category: [], amount: 0, currency: "INR", image: null,
          passOptions: { dailyPass: { enabled: false, price: 0 }, seasonPass: { enabled: false, price: 0 } },
        });
      } else {
        setError(data.message || "Failed to submit request");
        isSubmittingRef.current = false;
      }
    } catch (err) {
      setError(err.message || "Failed to submit request");
      isSubmittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  // ─── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="create-event">
        <div className="created-event-info">
          <h3>🎉 Request Submitted Successfully!</h3>
          <p>Your event request has been submitted for admin approval.</p>
          <p style={{ color: "var(--text-secondary)", marginTop: "10px" }}>
            You will be notified when it's approved. After approval, pay the
            platform fee of <strong>₹{PLATFORM_FEE}</strong> to publish your event.
          </p>
          <div style={{ display: "flex", gap: "15px", marginTop: "20px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="submit-btn"
              onClick={() => { setSuccess(false); isSubmittingRef.current = false; }}
            >
              ✨ Submit Another Request
            </button>
            <button className="cancel-btn" onClick={() => navigate("/bookings")}>
              📋 View My Requests
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="create-event"><CreateEventSkeleton /></div>;
  }

  // ─── Main Form ─────────────────────────────────────────────────────────────
  const isMultiDay = eventData.eventType === "multi-day";

  return (
    <div className="create-event">
      <button onClick={() => navigate("/")} className="back-btn">← Back to Events</button>

      <h2>📝 Request to Create Event</h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: "25px" }}>
        Fill in the event details below. Your request will be reviewed by an admin.
        Once approved, you'll pay a platform fee of <strong>₹{PLATFORM_FEE}</strong> to publish your event.
      </p>

      {/* ── Confirmation Modal ─────────────────────────────────────────────── */}
      {showConfirmModal && (
        <div className="payment-modal">
          <div className="payment-modal-content">
            <h3>📋 Confirm Event Request</h3>
            <p>You're about to submit a request to create:</p>
            <div className="payment-amount" style={{ fontSize: "18px", marginBottom: "10px" }}>
              {eventData.name}
            </div>

            {/* Date summary */}
            {isMultiDay ? (
              <p style={{ color: "var(--text-secondary)", marginBottom: "5px" }}>
                📅 {new Date(eventData.eventDate).toLocaleDateString()} →{" "}
                {new Date(eventData.endDate).toLocaleDateString()} &nbsp;
                <strong>({daysBetween(eventData.eventDate, eventData.endDate)} days)</strong>
              </p>
            ) : (
              <p style={{ color: "var(--text-secondary)", marginBottom: "5px" }}>
                📅 {new Date(eventData.eventDate).toLocaleString()}
              </p>
            )}

            <p style={{ color: "var(--text-secondary)", marginBottom: "8px" }}>
              🎫 {eventData.totalSeats} seats • {eventData.type === "public" ? "🌍 Public" : "🔒 Private"}
            </p>

            {/* Pricing summary */}
            {isMultiDay ? (
              <div style={{ marginBottom: "12px", fontSize: "14px", color: "var(--text-secondary)" }}>
                {eventData.passOptions.dailyPass.enabled && (
                  <p style={{ margin: "3px 0" }}>
                    🎫 Day Pass: <strong>{fmtCurrency(eventData.passOptions.dailyPass.price)}</strong> / day
                  </p>
                )}
                {eventData.passOptions.seasonPass.enabled && (
                  <p style={{ margin: "3px 0" }}>
                    🏆 Season Pass: <strong>{fmtCurrency(eventData.passOptions.seasonPass.price)}</strong> (full event)
                  </p>
                )}
              </div>
            ) : (
              <p style={{ color: "var(--text-secondary)", marginBottom: "12px", fontSize: "14px" }}>
                💰 Ticket Price: <strong>{fmtCurrency(eventData.amount)}</strong>
              </p>
            )}

            <p className="payment-warning">
              ⚠️ After admin approval, you'll pay ₹{PLATFORM_FEE} platform fee.
            </p>
            <div className="payment-buttons">
              <button onClick={submitRequest} className="success-btn">✅ Submit Request</button>
              <button onClick={() => setShowConfirmModal(false)} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="event-form">

        {/* Name */}
        <div className="form-group">
          <label>Event Name:</label>
          <input type="text" name="name" value={eventData.name} onChange={handleChange}
            required placeholder="e.g., Rock Concert 2024" />
        </div>

        {/* Description */}
        <div className="form-group">
          <label>Description:</label>
          <textarea name="description" value={eventData.description} onChange={handleChange}
            required placeholder="Describe your event..." rows="4" maxLength="1500" />
          <small>{eventData.description.length}/1500 characters</small>
        </div>

        {/* ── Event Duration Toggle ──────────────────────────────────────── */}
        <div className="form-group">
          <label>Event Duration:</label>
          <div
            style={{
              display:       "flex",
              gap:           "10px",
              flexWrap:      "wrap",
              marginTop:     "8px",
            }}
          >
            {[
              { value: "single-day", icon: "🎯", label: "Single Day" },
              { value: "multi-day",  icon: "📆", label: "Multi-Day"  },
            ].map(({ value, icon, label }) => {
              const active = eventData.eventType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleEventTypeChange(value)}
                  style={{
                    flex:         "1",
                    minWidth:     "120px",
                    padding:      "12px 16px",
                    borderRadius: "10px",
                    border:       active ? "2px solid #6366f1" : "1px solid #e2e8f0",
                    background:   active ? "#eef2ff" : "#f8fafc",
                    color:        active ? "#6366f1" : "#64748b",
                    cursor:       "pointer",
                    fontWeight:   active ? "700" : "500",
                    fontSize:     "15px",
                    transition:   "all 0.2s",
                    textAlign:    "center",
                  }}
                >
                  {icon} {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Start Date (always shown) ──────────────────────────────────── */}
        <div className="form-group">
          <label>{isMultiDay ? "Start Date & Time:" : "Event Date & Time:"}</label>
          <input
            type="datetime-local"
            name="eventDate"
            value={eventData.eventDate}
            onChange={handleChange}
            required
          />
        </div>

        {/* ── End Date (multi-day only) ──────────────────────────────────── */}
        {isMultiDay && (
          <div className="form-group">
            <label>End Date:</label>
            <input
              type="date"
              name="endDate"
              value={eventData.endDate}
              onChange={handleChange}
              min={
                eventData.eventDate
                  ? eventData.eventDate.substring(0, 10)
                  : undefined
              }
              required
            />
            {eventData.eventDate && eventData.endDate && (
              <small style={{ color: "var(--accent-primary)" }}>
                📆 {daysBetween(eventData.eventDate, eventData.endDate)} day event
              </small>
            )}
          </div>
        )}

        {/* Category */}
        <div className="form-group">
          <label>Event Category (Multi-select):</label>
          <div className="category-checkboxes">
            {[
              { value: "food-drink",          label: "🍔 Food & Drink" },
              { value: "festivals-cultural",   label: "🎊 Festivals & Cultural" },
              { value: "dance-party",          label: "💃 Dance & Party" },
            ].map(({ value, label }) => (
              <label key={value} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={eventData.category.includes(value)}
                  onChange={() => handleCategoryChange(value)}
                />
                <span className="checkbox-text">{label}</span>
              </label>
            ))}
          </div>
          <label style={{ marginTop: "15px" }}>Or select single category:</label>
          <select
            value={
              eventData.category.find(
                (c) => !["food-drink", "festivals-cultural", "dance-party"].includes(c),
              ) || ""
            }
            onChange={(e) => e.target.value && handleCategoryChange(e.target.value)}
          >
            <option value="">-- Select --</option>
            <option value="concerts-music">🎵 Concerts & Music Fest</option>
            <option value="sports-live">⚽ Sports & Live Matches</option>
            <option value="arts-theater">🎭 Arts & Theater</option>
            <option value="comedy-standup">😂 Comedy & Stand-up</option>
            <option value="movies-premieres">🎬 Movies & Premieres</option>
          </select>
        </div>

        {/* Total Seats */}
        <div className="form-group">
          <label>Total Seats:</label>
          <input type="number" name="totalSeats" value={eventData.totalSeats}
            onChange={handleChange} required min="1" />
        </div>

        {/* ── Pricing ────────────────────────────────────────────────────── */}
        {isMultiDay ? (
          /* Multi-day: pass options */
          <div className="form-group">
            <label>🎟️ Pass Options:</label>
            <div
              style={{
                background:   "var(--bg-secondary)",
                border:       "1px solid var(--border-color)",
                borderRadius: "10px",
                padding:      "16px",
                marginTop:    "8px",
                display:      "flex",
                flexDirection:"column",
                gap:          "16px",
              }}
            >
              {/* Daily Pass */}
              <div>
                <label
                  style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" }}
                >
                  <input
                    type="checkbox"
                    checked={eventData.passOptions.dailyPass.enabled}
                    onChange={(e) => handlePassChange("dailyPass", "enabled", e.target.checked)}
                    style={{ width: "16px", height: "16px" }}
                  />
                  <span style={{ fontWeight: "600" }}>🎫 Day Pass</span>
                  <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                    — price per single day attendance
                  </span>
                </label>
                {eventData.passOptions.dailyPass.enabled && (
                  <div style={{ marginTop: "10px", paddingLeft: "26px" }}>
                    <label style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      Price per day (₹):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={eventData.passOptions.dailyPass.price}
                      onChange={(e) => handlePassChange("dailyPass", "price", e.target.value)}
                      placeholder="e.g., 500"
                      style={{ marginTop: "6px" }}
                    />
                  </div>
                )}
              </div>

              {/* Season Pass */}
              <div>
                <label
                  style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" }}
                >
                  <input
                    type="checkbox"
                    checked={eventData.passOptions.seasonPass.enabled}
                    onChange={(e) => handlePassChange("seasonPass", "enabled", e.target.checked)}
                    style={{ width: "16px", height: "16px" }}
                  />
                  <span style={{ fontWeight: "600" }}>🏆 Season Pass</span>
                  <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                    — one price for the entire event
                  </span>
                </label>
                {eventData.passOptions.seasonPass.enabled && (
                  <div style={{ marginTop: "10px", paddingLeft: "26px" }}>
                    <label style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      Full event price (₹):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={eventData.passOptions.seasonPass.price}
                      onChange={(e) => handlePassChange("seasonPass", "price", e.target.value)}
                      placeholder="e.g., 1500"
                      style={{ marginTop: "6px" }}
                    />
                  </div>
                )}
              </div>

              {/* Tip */}
              {eventData.passOptions.dailyPass.enabled && eventData.passOptions.seasonPass.enabled &&
                eventData.eventDate && eventData.endDate && (
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, paddingTop: "4px" }}>
                  💡 Season pass ({fmtCurrency(eventData.passOptions.seasonPass.price)}) vs{" "}
                  {daysBetween(eventData.eventDate, eventData.endDate)} × Day pass (
                  {fmtCurrency(
                    eventData.passOptions.dailyPass.price * daysBetween(eventData.eventDate, eventData.endDate),
                  )}{" "}
                  total)
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Single-day: per-ticket price */
          <div className="form-group">
            <label>Ticket Price (₹):</label>
            <input
              type="number"
              name="amount"
              value={eventData.amount}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              placeholder="e.g., 500 (0 for free event)"
            />
            <small>Price per ticket in Indian Rupees (INR)</small>
          </div>
        )}

        {/* Image */}
        <div className="form-group">
          <label>Event Image:</label>
          <input type="file" accept="image/*" onChange={handleImageChange} className="file-input" />
          <small>Upload an image for your event (max 5MB, JPG/PNG)</small>
          {eventData.image && (
            <div className="image-preview">
              <img src={eventData.image} alt="Event preview"
                style={{ maxWidth: "200px", marginTop: "10px", borderRadius: "8px" }} />
              <button
                type="button"
                onClick={() => setEventData((prev) => ({ ...prev, image: null }))}
                style={{
                  marginLeft:   "10px",
                  background:   "#ef4444",
                  color:        "white",
                  border:       "none",
                  padding:      "5px 10px",
                  borderRadius: "4px",
                  cursor:       "pointer",
                }}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Event visibility type */}
        <div className="form-group">
          <label>Event Type:</label>
          <select name="type" value={eventData.type} onChange={handleChange} required>
            <option value="public">🌍 Public (Visible to everyone)</option>
            <option value="private">🔒 Private (Only accessible by ID)</option>
          </select>
          <small>Public events appear on home page. Private events can only be found by searching their ID.</small>
        </div>

        {/* Platform fee info */}
        <div
          className="platform-fee-info"
          style={{
            background:   "var(--bg-secondary)",
            border:       "1px solid var(--border-color)",
            borderRadius: "8px",
            padding:      "15px",
            marginBottom: "20px",
          }}
        >
          <h4 style={{ marginBottom: "10px", color: "var(--primary-color)" }}>💡 Platform Fee Information</h4>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>
            Once your event request is approved by an admin, you'll need to pay a platform fee of{" "}
            <strong style={{ color: "var(--primary-color)" }}>₹{PLATFORM_FEE}</strong> to publish your event.
            This fee helps us maintain the platform and provide support.
          </p>
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? "Processing..." : "✨ Continue to Review"}
        </button>
      </form>
    </div>
  );
}

export default RequestEvent;
