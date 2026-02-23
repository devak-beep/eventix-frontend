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
    name: "",
    description: "",
    eventDate: "",
    totalSeats: 10,
    type: "public",
    category: [],
    amount: 0,
    currency: "INR",
    image: null,
  });

  // State for UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEventData({
      ...eventData,
      [name]: value,
    });
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
      setEventData((prev) => ({
        ...prev,
        category: [categoryValue],
      }));
    }
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        processImageToCardRatio(reader.result)
          .then((processedImage) => {
            setEventData({
              ...eventData,
              image: processedImage,
            });
            setError("");
          })
          .catch(() => {
            setError("Failed to process image");
          });
      };
      reader.readAsDataURL(file);
    }
  };

  // Card aspect ratio (16:9)
  const CARD_ASPECT_RATIO = 16 / 9;

  // Process image to card aspect ratio with blur fill
  const processImageToCardRatio = (base64Image) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        const imgAspectRatio = width / height;

        if (
          Math.abs(imgAspectRatio - CARD_ASPECT_RATIO) / CARD_ASPECT_RATIO <
          0.05
        ) {
          resolve(base64Image);
          return;
        }

        let canvasWidth, canvasHeight;
        if (imgAspectRatio < CARD_ASPECT_RATIO) {
          canvasHeight = height;
          canvasWidth = Math.round(height * CARD_ASPECT_RATIO);
        } else {
          canvasWidth = width;
          canvasHeight = Math.round(width / CARD_ASPECT_RATIO);
        }

        const minWidth = 800;
        if (canvasWidth < minWidth) {
          const scale = minWidth / canvasWidth;
          canvasWidth = minWidth;
          canvasHeight = Math.round(canvasHeight * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d");

        const blurRadius = Math.min(
          80,
          Math.max(40, Math.round(canvasWidth / 15)),
        );

        const bgScaleX = canvasWidth / width;
        const bgScaleY = canvasHeight / height;
        const bgScale = Math.max(bgScaleX, bgScaleY);
        const bgWidth = width * bgScale;
        const bgHeight = height * bgScale;
        const bgX = (canvasWidth - bgWidth) / 2;
        const bgY = (canvasHeight - bgHeight) / 2;

        ctx.filter = `blur(${blurRadius}px) brightness(0.85)`;
        ctx.drawImage(img, bgX, bgY, bgWidth, bgHeight);
        ctx.filter = "none";

        const fgScaleX = canvasWidth / width;
        const fgScaleY = canvasHeight / height;
        const fgScale = Math.min(fgScaleX, fgScaleY);
        const fgWidth = width * fgScale;
        const fgHeight = height * fgScale;
        const fgX = (canvasWidth - fgWidth) / 2;
        const fgY = (canvasHeight - fgHeight) / 2;

        ctx.drawImage(img, fgX, fgY, fgWidth, fgHeight);

        const processedImage = canvas.toDataURL("image/jpeg", 0.92);
        resolve(processedImage);
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = base64Image;
    });
  };

  // Validate form
  const validateForm = () => {
    if (!eventData.name.trim()) {
      setError("Event name is required");
      return false;
    }

    if (!eventData.category || eventData.category.length === 0) {
      setError("Please select at least one category");
      return false;
    }

    if (eventData.description.trim().length < 10) {
      setError("Description must be at least 10 characters long");
      return false;
    }

    if (eventData.description.trim().length > 1500) {
      setError("Description must not exceed 1500 characters");
      return false;
    }

    const selectedDate = new Date(eventData.eventDate);
    const now = new Date();
    if (selectedDate <= now) {
      setError("Event date and time must be in the future");
      return false;
    }

    if (eventData.totalSeats < 1) {
      setError("Total seats must be at least 1");
      return false;
    }

    return true;
  };

  // Handle form submission (show confirmation)
  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setShowConfirmModal(true);
  };

  // Submit request to backend
  const submitRequest = async () => {
    if (isSubmittingRef.current) {
      console.log("Already submitting, ignoring duplicate click");
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setError("");
    setShowConfirmModal(false);

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      const response = await fetch(`${API_BASE_URL}/event-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
          "x-user-id": user._id,
          "x-user-role": user.role,
        },
        body: JSON.stringify({
          ...eventData,
          idempotencyKey,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setEventData({
          name: "",
          description: "",
          eventDate: "",
          totalSeats: 10,
          type: "public",
          category: [],
          amount: 0,
          currency: "INR",
          image: null,
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

  // Success state - matching CreateEvent success style
  if (success) {
    return (
      <div className="create-event">
        <div className="created-event-info">
          <h3>🎉 Request Submitted Successfully!</h3>
          <p>Your event request has been submitted for admin approval.</p>
          <p style={{ color: "var(--text-secondary)", marginTop: "10px" }}>
            You will be notified when it's approved. After approval, pay the
            platform fee of <strong>₹{PLATFORM_FEE}</strong> to publish your
            event.
          </p>
          <div
            style={{
              display: "flex",
              gap: "15px",
              marginTop: "20px",
              justifyContent: "center",
            }}
          >
            <button
              className="submit-btn"
              onClick={() => {
                setSuccess(false);
                isSubmittingRef.current = false;
              }}
            >
              ✨ Submit Another Request
            </button>
            <button
              className="cancel-btn"
              onClick={() => navigate("/bookings")}
            >
              📋 View My Requests
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="create-event">
        <CreateEventSkeleton />
      </div>
    );
  }

  return (
    <div className="create-event">
      <button onClick={() => navigate("/")} className="back-btn">
        ← Back to Events
      </button>

      <h2>📝 Request to Create Event</h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: "25px" }}>
        Fill in the event details below. Your request will be reviewed by an
        admin. Once approved, you'll pay a platform fee of{" "}
        <strong>₹{PLATFORM_FEE}</strong> to create your event.
      </p>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="payment-modal">
          <div className="payment-modal-content">
            <h3>📋 Confirm Event Request</h3>
            <p>You're about to submit a request to create:</p>
            <div
              className="payment-amount"
              style={{ fontSize: "18px", marginBottom: "10px" }}
            >
              {eventData.name}
            </div>
            <p style={{ color: "var(--text-secondary)", marginBottom: "5px" }}>
              📅 {new Date(eventData.eventDate).toLocaleString()}
            </p>
            <p style={{ color: "var(--text-secondary)", marginBottom: "15px" }}>
              🎫 {eventData.totalSeats} seats •{" "}
              {eventData.type === "public" ? "🌍 Public" : "🔒 Private"}
            </p>
            <p className="payment-warning">
              ⚠️ After admin approval, you'll pay ₹{PLATFORM_FEE} platform fee.
            </p>
            <div className="payment-buttons">
              <button onClick={submitRequest} className="success-btn">
                ✅ Submit Request
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && <div className="error">{error}</div>}

      {/* Event Request Form - matching CreateEvent style */}
      <form onSubmit={handleSubmit} className="event-form">
        <div className="form-group">
          <label>Event Name:</label>
          <input
            type="text"
            name="name"
            value={eventData.name}
            onChange={handleChange}
            required
            placeholder="e.g., Rock Concert 2024"
          />
        </div>

        <div className="form-group">
          <label>Description:</label>
          <textarea
            name="description"
            value={eventData.description}
            onChange={handleChange}
            required
            placeholder="Describe your event..."
            rows="4"
            maxLength="1500"
          />
          <small>{eventData.description.length}/1500 characters</small>
        </div>

        <div className="form-group">
          <label>Event Date & Time:</label>
          <input
            type="datetime-local"
            name="eventDate"
            value={eventData.eventDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Event Category (Multi-select):</label>
          <div className="category-checkboxes">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={eventData.category.includes("food-drink")}
                onChange={() => handleCategoryChange("food-drink")}
              />
              <span className="checkbox-text">🍔 Food & Drink</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={eventData.category.includes("festivals-cultural")}
                onChange={() => handleCategoryChange("festivals-cultural")}
              />
              <span className="checkbox-text">🎊 Festivals & Cultural</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={eventData.category.includes("dance-party")}
                onChange={() => handleCategoryChange("dance-party")}
              />
              <span className="checkbox-text">💃 Dance & Party</span>
            </label>
          </div>
          <label style={{ marginTop: "15px" }}>
            Or select single category:
          </label>
          <select
            value={
              eventData.category.find(
                (c) =>
                  !["food-drink", "festivals-cultural", "dance-party"].includes(
                    c,
                  ),
              ) || ""
            }
            onChange={(e) =>
              e.target.value && handleCategoryChange(e.target.value)
            }
          >
            <option value="">-- Select --</option>
            <option value="concerts-music">🎵 Concerts & Music Fest</option>
            <option value="sports-live">⚽ Sports & Live Matches</option>
            <option value="arts-theater">🎭 Arts & Theater</option>
            <option value="comedy-standup">😂 Comedy & Stand-up</option>
            <option value="movies-premieres">🎬 Movies & Premieres</option>
          </select>
        </div>

        <div className="form-group">
          <label>Total Seats:</label>
          <input
            type="number"
            name="totalSeats"
            value={eventData.totalSeats}
            onChange={handleChange}
            required
            min="1"
          />
        </div>

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

        <div className="form-group">
          <label>Event Image:</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="file-input"
          />
          <small>Upload an image for your event (max 5MB, JPG/PNG)</small>
          {eventData.image && (
            <div className="image-preview">
              <img
                src={eventData.image}
                alt="Event preview"
                style={{
                  maxWidth: "200px",
                  marginTop: "10px",
                  borderRadius: "8px",
                }}
              />
              <button
                type="button"
                onClick={() => setEventData({ ...eventData, image: null })}
                style={{
                  marginLeft: "10px",
                  background: "var(--danger-color)",
                  color: "white",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Event Type:</label>
          <select
            name="type"
            value={eventData.type}
            onChange={handleChange}
            required
          >
            <option value="public">🌍 Public (Visible to everyone)</option>
            <option value="private">🔒 Private (Only accessible by ID)</option>
          </select>
          <small>
            Public events appear on home page. Private events can only be found
            by searching their ID.
          </small>
        </div>

        {/* Platform Fee Info Box */}
        <div
          className="platform-fee-info"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "15px",
            marginBottom: "20px",
          }}
        >
          <h4 style={{ marginBottom: "10px", color: "var(--primary-color)" }}>
            💡 Platform Fee Information
          </h4>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "14px",
              margin: 0,
            }}
          >
            Once your event request is approved by an admin, you'll need to pay
            a platform fee of{" "}
            <strong style={{ color: "var(--primary-color)" }}>
              ₹{PLATFORM_FEE}
            </strong>{" "}
            to publish your event. This fee helps us maintain the platform and
            provide support.
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
