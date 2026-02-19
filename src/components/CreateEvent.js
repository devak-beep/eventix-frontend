// This component allows creating new events
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CreateEventSkeleton } from "./SkeletonLoader";
import { v4 as uuidv4 } from "uuid";

function CreateEvent({ userId }) {
  const navigate = useNavigate();

  // Debug: Log userId
  console.log("CreateEvent userId:", userId);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // State for event form
  const [eventData, setEventData] = useState({
    name: "",
    description: "",
    eventDate: "",
    totalSeats: 10,
    type: "public", // Default to public
    category: [], // Multi-select categories
    amount: 0, // Price per ticket in rupees
    currency: "INR",
    image: null, // Store base64 image
  });

  // State for UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdEventId, setCreatedEventId] = useState("");
  const [creationCharge, setCreationCharge] = useState(500);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Calculate creation charge based on total seats
  const calculateCreationCharge = (seats) => {
    if (seats <= 50) return 500;
    if (seats <= 100) return 1000;
    if (seats <= 200) return 1500;
    if (seats <= 500) return 2500;
    if (seats <= 1000) return 5000;
    if (seats <= 2000) return 8000;
    if (seats <= 5000) return 12000;
    if (seats <= 10000) return 20000;
    if (seats <= 20000) return 35000;
    if (seats <= 50000) return 60000;
    return 100000; // For >50000 seats
  };

  // Handle input changes for event form
  const handleEventChange = (e) => {
    const { name, value } = e.target;
    setEventData({
      ...eventData,
      [name]: value,
    });

    // Update creation charge when totalSeats changes
    if (name === "totalSeats") {
      setCreationCharge(calculateCreationCharge(parseInt(value) || 0));
    }
  };

  // Handle category checkbox changes
  const handleCategoryChange = (categoryValue) => {
    const multiSelectCategories = [
      "food-drink",
      "festivals-cultural",
      "dance-party",
    ];

    if (multiSelectCategories.includes(categoryValue)) {
      // Multi-select logic - clear dropdown selections first
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
      // Single select for dropdown - clear checkboxes first
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
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file");
        return;
      }

      // Convert to base64 and process to card aspect ratio with blurred background
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
          .catch((err) => {
            setError("Failed to process image");
            console.error(err);
          });
      };
      reader.readAsDataURL(file);
    }
  };

  // Card aspect ratio (16:9 for standard card display)
  const CARD_ASPECT_RATIO = 16 / 9;

  // Process image to card aspect ratio with blur fill (PicsArt style)
  const processImageToCardRatio = (base64Image) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        const imgAspectRatio = width / height;

        // If already matches card ratio (within 5% tolerance), return as-is
        if (
          Math.abs(imgAspectRatio - CARD_ASPECT_RATIO) / CARD_ASPECT_RATIO <
          0.05
        ) {
          resolve(base64Image);
          return;
        }

        // Calculate canvas dimensions based on the original image
        let canvasWidth, canvasHeight;

        if (imgAspectRatio < CARD_ASPECT_RATIO) {
          // Portrait or narrow image - height stays, width expands
          canvasHeight = height;
          canvasWidth = Math.round(height * CARD_ASPECT_RATIO);
        } else {
          // Landscape or wide image - width stays, height expands
          canvasWidth = width;
          canvasHeight = Math.round(width / CARD_ASPECT_RATIO);
        }

        // Ensure minimum resolution
        const minWidth = 800;
        if (canvasWidth < minWidth) {
          const scale = minWidth / canvasWidth;
          canvasWidth = minWidth;
          canvasHeight = Math.round(canvasHeight * scale);
        }

        // Create main canvas
        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d");

        // Calculate blur radius based on canvas size (40-80px range for good blur)
        const blurRadius = Math.min(
          80,
          Math.max(40, Math.round(canvasWidth / 15)),
        );

        // STEP 1: Draw the blurred background (scaled to COVER the entire canvas)
        const bgScaleX = canvasWidth / width;
        const bgScaleY = canvasHeight / height;
        const bgScale = Math.max(bgScaleX, bgScaleY); // Cover mode
        const bgWidth = width * bgScale;
        const bgHeight = height * bgScale;
        const bgX = (canvasWidth - bgWidth) / 2;
        const bgY = (canvasHeight - bgHeight) / 2;

        // Apply blur and slight darkening to background
        ctx.filter = `blur(${blurRadius}px) brightness(0.85)`;
        ctx.drawImage(img, bgX, bgY, bgWidth, bgHeight);

        // Reset filter
        ctx.filter = "none";

        // STEP 2: Draw the sharp original image centered (CONTAIN mode - no cropping)
        const fgScaleX = canvasWidth / width;
        const fgScaleY = canvasHeight / height;
        const fgScale = Math.min(fgScaleX, fgScaleY); // Contain mode - fits entirely
        const fgWidth = width * fgScale;
        const fgHeight = height * fgScale;
        const fgX = (canvasWidth - fgWidth) / 2;
        const fgY = (canvasHeight - fgHeight) / 2;

        // Draw the sharp foreground image
        ctx.drawImage(img, fgX, fgY, fgWidth, fgHeight);

        // Convert to base64 (JPEG with high quality)
        const processedImage = canvas.toDataURL("image/jpeg", 0.92);
        resolve(processedImage);
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = base64Image;
    });
  };

  // Submit event creation
  const handleCreateEvent = async (e) => {
    e.preventDefault(); // Prevent page reload

    setError("");

    // Validate category selection
    if (!eventData.category || eventData.category.length === 0) {
      setError("Please select at least one category");
      return;
    }

    // Validate description length
    if (eventData.description.trim().length < 10) {
      setError("Description must be at least 10 characters long");
      return;
    }

    if (eventData.description.trim().length > 1500) {
      setError("Description must not exceed 1500 characters");
      return;
    }

    // Validate event date is not in the past
    const selectedDate = new Date(eventData.eventDate);
    const now = new Date();

    if (selectedDate <= now) {
      setError("Event date and time must be in the future.");
      return;
    }

    // Show payment confirmation
    const charge = calculateCreationCharge(parseInt(eventData.totalSeats) || 0);
    setCreationCharge(charge);
    setShowPaymentConfirm(true);
  };

  // Handle payment confirmation
  const handlePayment = async () => {
    setLoading(true);
    setError("");

    try {
      const idempotencyKey = uuidv4();
      const user = JSON.parse(localStorage.getItem("user"));
      const API_BASE_URL =
        process.env.REACT_APP_API_URL || "http://localhost:3000/api";

      // Create Razorpay order first (without creating event)
      const orderResponse = await fetch(
        `${API_BASE_URL}/razorpay/create-event-order`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: creationCharge,
            eventData: { ...eventData, userId, idempotencyKey },
          }),
        },
      );

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.message || "Failed to create payment order");
      }

      // Load Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Eventix",
        description: `Event Creation Fee - ${eventData.name}`,
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            // Create event and verify payment together
            const verifyResponse = await fetch(
              `${API_BASE_URL}/razorpay/verify-event-payment`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  eventData: {
                    ...eventData,
                    userId,
                    userRole: user?.role || "user",
                    idempotencyKey,
                  },
                }),
              },
            );

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              setCreatedEventId(verifyData.event.id);
              setPaymentSuccess(true);
              setShowPaymentConfirm(false);

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
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#0070f3",
        },
        modal: {
          ondismiss: function () {
            setError("Payment cancelled. No event was created.");
            setLoading(false);
            setShowPaymentConfirm(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      // Handle explicit payment failure (card declined, etc.)
      razorpay.on("payment.failed", function (response) {
        setError(
          `Payment failed: ${response.error.description || "Transaction declined"}. No event was created.`,
        );
        setLoading(false);
        setShowPaymentConfirm(false);
      });

      razorpay.open();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to initiate payment",
      );
      setLoading(false);
    }
  };

  return (
    <div className="create-event">
      <button onClick={() => navigate("/")} className="back-btn">
        ← Back to Events
      </button>

      <h2>Create New Event</h2>

      {/* Payment Confirmation Modal */}
      {showPaymentConfirm && (
        <div className="payment-modal">
          <div className="payment-modal-content">
            <h3>Confirm Payment</h3>
            <p>Platform fee for creating this event:</p>
            <div className="payment-amount">₹{creationCharge}</div>
            <p className="payment-info">
              This fee covers hosting and managing your event on our platform.
            </p>
            <p className="payment-warning">
              ⚠️ Your event will only be created after successful payment
              verification.
            </p>
            <div className="payment-buttons">
              <button
                onClick={handlePayment}
                disabled={loading}
                className="success-btn"
              >
                {loading ? "Processing..." : "Pay & Create Event"}
              </button>
              <button
                onClick={() => setShowPaymentConfirm(false)}
                className="cancel-btn"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
            {error && (
              <div className="error" style={{ marginTop: "20px" }}>
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Message after payment */}
      {paymentSuccess && (
        <div className="created-event-info">
          <h3>Congratulations!</h3>
          <p>Your event has been created successfully!</p>
          <p>Platform fee paid: ₹{creationCharge}</p>
          <p>Copy this Event ID to share with others:</p>
          <div className="copy-section">
            <code>{createdEventId}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(createdEventId);
                alert("Event ID copied to clipboard!");
              }}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Show error messages */}
      {error && !showPaymentConfirm && <div className="error">{error}</div>}

      {/* Show loading skeleton while form is initializing */}
      {loading && !showPaymentConfirm && !paymentSuccess && (
        <CreateEventSkeleton />
      )}

      {/* Event creation form */}
      {!paymentSuccess && !loading && (
        <form onSubmit={handleCreateEvent} className="event-form">
          <div className="form-group">
            <label>Event Name:</label>
            <input
              type="text"
              name="name"
              value={eventData.name}
              onChange={handleEventChange}
              required
              placeholder="e.g., Rock Concert 2024"
            />
          </div>

          <div className="form-group">
            <label>Description:</label>
            <textarea
              name="description"
              value={eventData.description}
              onChange={handleEventChange}
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
              onChange={handleEventChange}
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
                    ![
                      "food-drink",
                      "festivals-cultural",
                      "dance-party",
                    ].includes(c),
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
              onChange={handleEventChange}
              required
              min="1"
            />
            {eventData.totalSeats > 0 && (
              <small className="creation-charge-info">
                Platform fee: ₹
                {calculateCreationCharge(parseInt(eventData.totalSeats) || 0)}
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Ticket Price (₹):</label>
            <input
              type="number"
              name="amount"
              value={eventData.amount}
              onChange={handleEventChange}
              required
              min="0"
              step="0.01"
              placeholder="e.g., 500"
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
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Event Type:</label>
            <select
              name="type"
              value={eventData.type}
              onChange={handleEventChange}
              required
            >
              <option value="public">🌍 Public (Visible to everyone)</option>
              <option value="private">
                🔒 Private (Only accessible by ID)
              </option>
            </select>
            <small>
              Public events appear on home page. Private events can only be
              found by searching their ID.
            </small>
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
