// This component allows creating new events (admin/superAdmin only)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CreateEventSkeleton } from "./SkeletonLoader";
import { v4 as uuidv4 } from "uuid";

function CreateEvent({ userId }) {
  const navigate = useNavigate();

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

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
    amount:      0,              // single-day ticket price
    currency:    "INR",
    image:       null,
    passOptions: {               // multi-day pass options
      dailyPass:  { enabled: false, price: 0 },
      seasonPass: { enabled: false, price: 0 },
    },
  });

  const [loading,             setLoading]             = useState(false);
  const [error,               setError]               = useState("");
  const [createdEventId,      setCreatedEventId]      = useState("");
  const [creationCharge,      setCreationCharge]      = useState(500);
  const [showPaymentConfirm,  setShowPaymentConfirm]  = useState(false);
  const [paymentSuccess,      setPaymentSuccess]      = useState(false);

  // ─── Creation charge ───────────────────────────────────────────────────────
  const calculateCreationCharge = (seats) => {
    if (seats <= 50)    return 500;
    if (seats <= 100)   return 1000;
    if (seats <= 200)   return 1500;
    if (seats <= 500)   return 2500;
    if (seats <= 1000)  return 5000;
    if (seats <= 2000)  return 8000;
    if (seats <= 5000)  return 12000;
    if (seats <= 10000) return 20000;
    if (seats <= 20000) return 35000;
    if (seats <= 50000) return 60000;
    return 100000;
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const daysBetween = (start, end) =>
    Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;

  const fmtCurrency = (v) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(v);

  // ─── Input handlers ────────────────────────────────────────────────────────
  const handleEventChange = (e) => {
    const { name, value } = e.target;
    setEventData((prev) => ({ ...prev, [name]: value }));
    if (name === "totalSeats") {
      setCreationCharge(calculateCreationCharge(parseInt(value) || 0));
    }
  };

  const handleEventTypeChange = (type) => {
    setEventData((prev) => ({ ...prev, eventType: type, endDate: "" }));
  };

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

  const handleCategoryChange = (categoryValue) => {
    const multiSelectCategories = ["food-drink", "festivals-cultural", "dance-party"];
    if (multiSelectCategories.includes(categoryValue)) {
      setEventData((prev) => {
        const filtered = prev.category.filter((c) => multiSelectCategories.includes(c));
        return {
          ...prev,
          category: filtered.includes(categoryValue)
            ? filtered.filter((c) => c !== categoryValue)
            : [...filtered, categoryValue],
        };
      });
    } else {
      setEventData((prev) => ({ ...prev, category: [categoryValue] }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { setError("Image size must be less than 5MB"); return; }
      if (!file.type.startsWith("image/")) { setError("Please upload an image file"); return; }

      const reader = new FileReader();
      reader.onloadend = () => {
        processImageToCardRatio(reader.result)
          .then((img) => { setEventData((prev) => ({ ...prev, image: img })); setError(""); })
          .catch(() => setError("Failed to process image"));
      };
      reader.readAsDataURL(file);
    }
  };

  const CARD_ASPECT_RATIO = 16 / 9;

  const processImageToCardRatio = (base64Image) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        const imgAR = width / height;

        if (Math.abs(imgAR - CARD_ASPECT_RATIO) / CARD_ASPECT_RATIO < 0.05) { resolve(base64Image); return; }

        let cw, ch;
        if (imgAR < CARD_ASPECT_RATIO) { ch = height; cw = Math.round(height * CARD_ASPECT_RATIO); }
        else                           { cw = width;  ch = Math.round(width / CARD_ASPECT_RATIO); }

        if (cw < 800) { const s = 800 / cw; cw = 800; ch = Math.round(ch * s); }

        const canvas = document.createElement("canvas");
        canvas.width = cw; canvas.height = ch;
        const ctx = canvas.getContext("2d");
        const blur = Math.min(80, Math.max(40, Math.round(cw / 15)));

        const bgS = Math.max(cw / width, ch / height);
        ctx.filter = `blur(${blur}px) brightness(0.85)`;
        ctx.drawImage(img, (cw - width * bgS) / 2, (ch - height * bgS) / 2, width * bgS, height * bgS);
        ctx.filter = "none";

        const fgS = Math.min(cw / width, ch / height);
        ctx.drawImage(img, (cw - width * fgS) / 2, (ch - height * fgS) / 2, width * fgS, height * fgS);

        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = base64Image;
    });
  };

  // ─── Validate & show payment modal ────────────────────────────────────────
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setError("");

    if (!eventData.category || eventData.category.length === 0) {
      setError("Please select at least one category"); return;
    }
    if (eventData.description.trim().length < 10) {
      setError("Description must be at least 10 characters long"); return;
    }
    if (eventData.description.trim().length > 1500) {
      setError("Description must not exceed 1500 characters"); return;
    }

    const selectedDate = new Date(eventData.eventDate);
    if (selectedDate <= new Date()) {
      setError("Event date and time must be in the future."); return;
    }

    if (eventData.eventType === "multi-day") {
      if (!eventData.endDate) { setError("End date is required for multi-day events"); return; }
      if (new Date(eventData.endDate) <= selectedDate) {
        setError("End date must be after the start date"); return;
      }
      const { dailyPass, seasonPass } = eventData.passOptions;
      if (!dailyPass.enabled && !seasonPass.enabled) {
        setError("Enable at least one pass option (Day Pass or Season Pass)"); return;
      }
    }

    const charge = calculateCreationCharge(parseInt(eventData.totalSeats) || 0);
    setCreationCharge(charge);
    setShowPaymentConfirm(true);
  };

  // ─── Razorpay payment ──────────────────────────────────────────────────────
  const handlePayment = async () => {
    setLoading(true);
    setError("");

    try {
      const idempotencyKey = uuidv4();
      const user = JSON.parse(localStorage.getItem("user"));
      const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/api";

      // Build eventData payload
      const eventPayload = { ...eventData, userId, idempotencyKey };
      // Clean up irrelevant pricing fields
      if (eventData.eventType === "single-day") {
        delete eventPayload.endDate;
        delete eventPayload.passOptions;
      } else {
        delete eventPayload.amount;
      }

      const orderResponse = await fetch(`${API_BASE_URL}/razorpay/create-event-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: creationCharge, eventData: eventPayload }),
      });

      const orderData = await orderResponse.json();
      if (!orderData.success) throw new Error(orderData.message || "Failed to create payment order");

      const options = {
        key:         orderData.keyId,
        amount:      orderData.amount,
        currency:    orderData.currency,
        name:        "Eventix",
        description: `Event Creation Fee - ${eventData.name}`,
        order_id:    orderData.orderId,
        handler: async function (response) {
          try {
            const verifyResponse = await fetch(`${API_BASE_URL}/razorpay/verify-event-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                eventData: {
                  ...eventPayload,
                  userRole: user?.role || "user",
                },
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              setCreatedEventId(verifyData.event.id);
              setPaymentSuccess(true);
              setShowPaymentConfirm(false);
              setEventData({
                name: "", description: "", eventDate: "", endDate: "",
                eventType: "single-day", totalSeats: 10, type: "public",
                category: [], amount: 0, currency: "INR", image: null,
                passOptions: { dailyPass: { enabled: false, price: 0 }, seasonPass: { enabled: false, price: 0 } },
              });
              setCreationCharge(calculateCreationCharge(10));
            } else {
              setError("Payment verification failed");
            }
          } catch (err) {
            setError("Payment verification failed");
            console.error(err);
          } finally {
            setLoading(false);
          }
        },
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#0070f3" },
        modal: {
          ondismiss: function () {
            setError("Payment cancelled. No event was created.");
            setLoading(false);
            setShowPaymentConfirm(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response) {
        setError(`Payment failed: ${response.error.description || "Transaction declined"}. No event was created.`);
        setLoading(false);
        setShowPaymentConfirm(false);
      });
      razorpay.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to initiate payment");
      setLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  const isMultiDay = eventData.eventType === "multi-day";

  return (
    <div className="create-event">
      <button onClick={() => navigate("/")} className="back-btn">← Back to Events</button>
      <h2>Create New Event</h2>

      {/* ── Payment Confirm Modal ──────────────────────────────────────────── */}
      {showPaymentConfirm && (
        <div className="payment-modal">
          <div className="payment-modal-content">
            <h3>Confirm Payment</h3>
            <p>Platform fee for creating this event:</p>
            <div className="payment-amount">₹{creationCharge}</div>
            <p className="payment-info">
              This fee covers hosting and managing your event on our platform.
            </p>

            {/* Event summary */}
            {isMultiDay && eventData.eventDate && eventData.endDate && (
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: "8px 0" }}>
                📆 {new Date(eventData.eventDate).toLocaleDateString()} →{" "}
                {new Date(eventData.endDate).toLocaleDateString()}{" "}
                ({daysBetween(eventData.eventDate, eventData.endDate)} days)
              </p>
            )}
            {isMultiDay && (
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                {eventData.passOptions.dailyPass.enabled && (
                  <p style={{ margin: "3px 0" }}>🎫 Day Pass: {fmtCurrency(eventData.passOptions.dailyPass.price)}/day</p>
                )}
                {eventData.passOptions.seasonPass.enabled && (
                  <p style={{ margin: "3px 0" }}>🏆 Season Pass: {fmtCurrency(eventData.passOptions.seasonPass.price)}</p>
                )}
              </div>
            )}

            <p className="payment-warning">
              ⚠️ Your event will only be created after successful payment verification.
            </p>
            <div className="payment-buttons">
              <button onClick={handlePayment} disabled={loading} className="success-btn">
                {loading ? "Processing..." : "Pay & Create Event"}
              </button>
              <button onClick={() => setShowPaymentConfirm(false)} className="cancel-btn" disabled={loading}>
                Cancel
              </button>
            </div>
            {error && <div className="error" style={{ marginTop: "20px" }}>{error}</div>}
          </div>
        </div>
      )}

      {/* ── Success ────────────────────────────────────────────────────────── */}
      {paymentSuccess && (
        <div className="created-event-info">
          <h3>Congratulations!</h3>
          <p>Your event has been created successfully!</p>
          <p>Platform fee paid: ₹{creationCharge}</p>
          <p>Copy this Event ID to share with others:</p>
          <div className="copy-section">
            <code>{createdEventId}</code>
            <button onClick={() => { navigator.clipboard.writeText(createdEventId); alert("Event ID copied to clipboard!"); }}>
              Copy
            </button>
          </div>
        </div>
      )}

      {error && !showPaymentConfirm && <div className="error">{error}</div>}
      {loading && !showPaymentConfirm && !paymentSuccess && <CreateEventSkeleton />}

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      {!paymentSuccess && !loading && (
        <form onSubmit={handleCreateEvent} className="event-form">

          {/* Name */}
          <div className="form-group">
            <label>Event Name:</label>
            <input type="text" name="name" value={eventData.name} onChange={handleEventChange}
              required placeholder="e.g., Rock Concert 2024" />
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description:</label>
            <textarea name="description" value={eventData.description} onChange={handleEventChange}
              required placeholder="Describe your event..." rows="4" maxLength="1500" />
            <small>{eventData.description.length}/1500 characters</small>
          </div>

          {/* ── Event Duration Toggle ────────────────────────────────────── */}
          <div className="form-group">
            <label>Event Duration:</label>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "8px" }}>
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
                      border:       active
                        ? "2px solid var(--accent-primary)"
                        : "1px solid var(--border-color)",
                      background:   active
                        ? "rgba(var(--accent-primary-rgb,99,102,241),0.12)"
                        : "var(--bg-secondary)",
                      color:        active ? "var(--accent-primary)" : "var(--text-secondary)",
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

          {/* Start Date */}
          <div className="form-group">
            <label>{isMultiDay ? "Start Date & Time:" : "Event Date & Time:"}</label>
            <input type="datetime-local" name="eventDate" value={eventData.eventDate}
              onChange={handleEventChange} required />
          </div>

          {/* End Date (multi-day only) */}
          {isMultiDay && (
            <div className="form-group">
              <label>End Date:</label>
              <input
                type="date"
                name="endDate"
                value={eventData.endDate}
                onChange={handleEventChange}
                min={eventData.eventDate ? eventData.eventDate.substring(0, 10) : undefined}
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
                { value: "food-drink",        label: "🍔 Food & Drink" },
                { value: "festivals-cultural", label: "🎊 Festivals & Cultural" },
                { value: "dance-party",        label: "💃 Dance & Party" },
              ].map(({ value, label }) => (
                <label key={value} className="checkbox-label">
                  <input type="checkbox" checked={eventData.category.includes(value)}
                    onChange={() => handleCategoryChange(value)} />
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
              onChange={handleEventChange} required min="1" />
            {eventData.totalSeats > 0 && (
              <small className="creation-charge-info">
                Platform fee: ₹{calculateCreationCharge(parseInt(eventData.totalSeats) || 0)}
              </small>
            )}
          </div>

          {/* ── Pricing ──────────────────────────────────────────────────── */}
          {isMultiDay ? (
            <div className="form-group">
              <label>🎟️ Pass Options:</label>
              <div
                style={{
                  background:    "var(--bg-secondary)",
                  border:        "1px solid var(--border-color)",
                  borderRadius:  "10px",
                  padding:       "16px",
                  marginTop:     "8px",
                  display:       "flex",
                  flexDirection: "column",
                  gap:           "16px",
                }}
              >
                {/* Daily Pass */}
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" }}>
                    <input
                      type="checkbox"
                      checked={eventData.passOptions.dailyPass.enabled}
                      onChange={(e) => handlePassChange("dailyPass", "enabled", e.target.checked)}
                      style={{ width: "16px", height: "16px" }}
                    />
                    <span style={{ fontWeight: "600" }}>🎫 Day Pass</span>
                    <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>— price per single day</span>
                  </label>
                  {eventData.passOptions.dailyPass.enabled && (
                    <div style={{ marginTop: "10px", paddingLeft: "26px" }}>
                      <label style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Price per day (₹):</label>
                      <input
                        type="number" min="0" step="1"
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
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" }}>
                    <input
                      type="checkbox"
                      checked={eventData.passOptions.seasonPass.enabled}
                      onChange={(e) => handlePassChange("seasonPass", "enabled", e.target.checked)}
                      style={{ width: "16px", height: "16px" }}
                    />
                    <span style={{ fontWeight: "600" }}>🏆 Season Pass</span>
                    <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>— one price for whole event</span>
                  </label>
                  {eventData.passOptions.seasonPass.enabled && (
                    <div style={{ marginTop: "10px", paddingLeft: "26px" }}>
                      <label style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Full event price (₹):</label>
                      <input
                        type="number" min="0" step="1"
                        value={eventData.passOptions.seasonPass.price}
                        onChange={(e) => handlePassChange("seasonPass", "price", e.target.value)}
                        placeholder="e.g., 1500"
                        style={{ marginTop: "6px" }}
                      />
                    </div>
                  )}
                </div>

                {/* Comparison hint */}
                {eventData.passOptions.dailyPass.enabled && eventData.passOptions.seasonPass.enabled &&
                  eventData.eventDate && eventData.endDate && (
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
                    💡 Season ({fmtCurrency(eventData.passOptions.seasonPass.price)}) vs{" "}
                    {daysBetween(eventData.eventDate, eventData.endDate)} × Day (
                    {fmtCurrency(eventData.passOptions.dailyPass.price * daysBetween(eventData.eventDate, eventData.endDate))} total)
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label>Ticket Price (₹):</label>
              <input type="number" name="amount" value={eventData.amount} onChange={handleEventChange}
                required min="0" step="0.01" placeholder="e.g., 500" />
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
              </div>
            )}
          </div>

          {/* Event visibility */}
          <div className="form-group">
            <label>Event Type:</label>
            <select name="type" value={eventData.type} onChange={handleEventChange} required>
              <option value="public">🌍 Public (Visible to everyone)</option>
              <option value="private">🔒 Private (Only accessible by ID)</option>
            </select>
            <small>Public events appear on home page. Private events can only be found by searching their ID.</small>
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? "Processing..." : "✨ Continue to Payment"}
          </button>
        </form>
      )}
    </div>
  );
}

export default CreateEvent;
