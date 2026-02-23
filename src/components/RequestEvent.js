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
  const [idempotencyKey] = useState(() => uuidv4()); // Generate once per form

  // State for event form
  const [eventData, setEventData] = useState({
    name: "",
    description: "",
    eventDate: "",
    totalSeats: 10,
    type: "public",
    category: [],
    amount: 0, // Price per ticket
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
    // Prevent duplicate submissions
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
          idempotencyKey, // Include idempotency key
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // Reset form
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
        isSubmittingRef.current = false; // Allow retry on error
      }
    } catch (err) {
      setError(err.message || "Failed to submit request");
      isSubmittingRef.current = false; // Allow retry on error
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div
        className="create-event-form"
        style={{ textAlign: "center", padding: "40px" }}
      >
        <div style={{ fontSize: "60px", marginBottom: "20px" }}>🎉</div>
        <h2>Request Submitted!</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "30px" }}>
          Your event request has been submitted for admin approval.
          <br />
          You will be notified when it's approved, and then you can pay the
          platform fee (₹{PLATFORM_FEE}) to create your event.
        </p>
        <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
          <button className="submit-btn" onClick={() => setSuccess(false)}>
            Submit Another Request
          </button>
          <button className="cancel-btn" onClick={() => navigate("/bookings")}>
            View My Requests
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <CreateEventSkeleton />;
  }

  return (
    <div className="create-event-form">
      <h2 style={{ marginBottom: "10px" }}>📝 Request to Create Event</h2>
      <p
        style={{
          color: "var(--text-secondary)",
          marginBottom: "25px",
          fontSize: "14px",
        }}
      >
        Fill in the event details below. Your request will be reviewed by an
        admin.
        <br />
        Once approved, you'll pay a platform fee of{" "}
        <strong>₹{PLATFORM_FEE}</strong> to create your event.
      </p>

      {error && (
        <div className="error-message" style={{ marginBottom: "20px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Event Name */}
        <div className="form-group">
          <label>Event Name *</label>
          <input
            type="text"
            name="name"
            value={eventData.name}
            onChange={handleChange}
            placeholder="Enter event name"
            required
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label>Description *</label>
          <textarea
            name="description"
            value={eventData.description}
            onChange={handleChange}
            placeholder="Describe your event (10-1500 characters)"
            rows="4"
            style={{ resize: "vertical" }}
          />
          <small style={{ color: "var(--text-secondary)" }}>
            {eventData.description.length}/1500 characters
          </small>
        </div>

        {/* Event Date */}
        <div className="form-group">
          <label>Event Date & Time *</label>
          <input
            type="datetime-local"
            name="eventDate"
            value={eventData.eventDate}
            onChange={handleChange}
            required
          />
        </div>

        {/* Total Seats */}
        <div className="form-group">
          <label>Total Seats *</label>
          <input
            type="number"
            name="totalSeats"
            value={eventData.totalSeats}
            onChange={handleChange}
            min="1"
            required
          />
        </div>

        {/* Event Type */}
        <div className="form-group">
          <label>Event Type</label>
          <select name="type" value={eventData.type} onChange={handleChange}>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        {/* Category Selection */}
        <div className="form-group">
          <label>Category *</label>
          <div style={{ marginBottom: "10px" }}>
            {["food-drink", "festivals-cultural", "dance-party"].map((cat) => (
              <label
                key={cat}
                style={{ marginRight: "15px", cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={eventData.category.includes(cat)}
                  onChange={() => handleCategoryChange(cat)}
                  style={{ marginRight: "5px" }}
                />
                {cat
                  .split("-")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" & ")}
              </label>
            ))}
          </div>
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
            <option value="">-- Or select a specific category --</option>
            <option value="sports-live">Sports & Live</option>
            <option value="arts-theater">Arts & Theater</option>
            <option value="comedy-standup">Comedy & Standup</option>
            <option value="movies-premieres">Movies & Premieres</option>
            <option value="concerts-music">Concerts & Music</option>
          </select>
        </div>

        {/* Ticket Price */}
        <div className="form-group">
          <label>Ticket Price (₹)</label>
          <input
            type="number"
            name="amount"
            value={eventData.amount}
            onChange={handleChange}
            min="0"
            placeholder="0 for free event"
          />
        </div>

        {/* Event Image */}
        <div className="form-group">
          <label>Event Image</label>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {eventData.image && (
            <div style={{ marginTop: "10px" }}>
              <img
                src={eventData.image}
                alt="Preview"
                style={{
                  width: "100%",
                  maxWidth: "300px",
                  borderRadius: "8px",
                }}
              />
              <button
                type="button"
                onClick={() => setEventData({ ...eventData, image: null })}
                style={{
                  marginTop: "5px",
                  background: "var(--danger-color)",
                  color: "white",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Remove Image
              </button>
            </div>
          )}
        </div>

        {/* Platform Fee Info */}
        <div
          style={{
            background: "var(--card-bg)",
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

        {/* Submit Button */}
        <div style={{ display: "flex", gap: "15px" }}>
          <button type="submit" className="submit-btn" disabled={loading}>
            Submit Request for Approval
          </button>
          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate("/")}
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>📋 Confirm Event Request</h3>
            <p style={{ marginBottom: "15px" }}>
              You're about to submit a request to create:
            </p>
            <div
              style={{
                background: "var(--bg-secondary)",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              <strong>{eventData.name}</strong>
              <br />
              <small style={{ color: "var(--text-secondary)" }}>
                {new Date(eventData.eventDate).toLocaleString()}
              </small>
              <br />
              <small style={{ color: "var(--text-secondary)" }}>
                {eventData.totalSeats} seats • {eventData.type}
              </small>
            </div>
            <p style={{ color: "var(--warning-color)", marginBottom: "20px" }}>
              ⚠️ After admin approval, you'll pay ₹{PLATFORM_FEE} platform fee.
            </p>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                className="cancel-btn"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button className="submit-btn" onClick={submitRequest}>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestEvent;
