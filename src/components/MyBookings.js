// This component shows all bookings made by users
import React, { useState, useEffect, useRef } from "react";
import { getAllBookings, cancelBooking, getUserById } from "../api";
import { MyBookingsSkeleton } from "./SkeletonLoader";
import AdminRequests from "./AdminRequests";
import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";

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

      // Background: blurred cover
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

      // Foreground: sharp contain
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

function MyBookings({ userId }) {
  // State to store list of bookings
  const [bookings, setBookings] = useState([]);

  // State for user role
  const [userRole, setUserRole] = useState("user");

  // State for my events
  const [myEvents, setMyEvents] = useState([]);

  // State for loading and errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Toggle between bookings and events
  const [activeTab, setActiveTab] = useState("bookings"); // 'bookings' or 'events'

  // Image upload state
  const [uploadingImageFor, setUploadingImageFor] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch user role on mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await getUserById(userId);
        const freshRole = response.data.role || "user";
        setUserRole(freshRole);

        // IMPORTANT: Also update localStorage with fresh role
        // This ensures if user was promoted, we get the new role immediately
        const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
        if (savedUser.role !== freshRole) {
          savedUser.role = freshRole;
          localStorage.setItem("user", JSON.stringify(savedUser));
          console.log(`Updated user role in localStorage: ${freshRole}`);
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
      }
    };
    fetchUserRole();
  }, [userId]);

  // Fetch bookings when component loads
  useEffect(() => {
    if (activeTab === "bookings") {
      fetchBookings();
    } else {
      fetchMyEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Function to get all bookings from backend
  const fetchBookings = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getAllBookings();
      console.log("=== BOOKINGS DEBUG ===");
      console.log("Full response:", response);
      console.log("Current userId:", userId);
      console.log("All bookings:", response.data);

      // Filter bookings to show only current user's bookings
      const userBookings = (response.data || []).filter((booking) => {
        console.log("Checking booking:", booking._id);
        console.log("Booking user:", booking.user);

        // Skip bookings with null user
        if (!booking.user) {
          console.log("Skipping - null user");
          return false;
        }

        // Check if user is an object (populated) or string (ID)
        const bookingUserId =
          typeof booking.user === "object" ? booking.user._id : booking.user;
        console.log(
          "Booking userId:",
          bookingUserId,
          "Current userId:",
          userId,
          "Match:",
          bookingUserId === userId,
        );
        return bookingUserId === userId;
      });
      console.log("Filtered bookings count:", userBookings.length);
      console.log("Filtered bookings:", userBookings);
      setBookings(userBookings);
    } catch (err) {
      setError("Failed to load bookings");
      console.error("Error fetching bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch user's created events
  const fetchMyEvents = async () => {
    setLoading(true);
    setError("");

    try {
      console.log("Fetching events for userId:", userId);
      const response = await axios.get(
        `${API_BASE_URL}/events/my-events?userId=${userId}&t=${Date.now()}`,
      );
      console.log("My events response:", response.data);
      setMyEvents(response.data.data || []);
    } catch (err) {
      setError("Failed to load your events");
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle image update for an event
  const handleImageUpdate = async (eventId, file) => {
    if (!file) return;

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

    setUploadingImageFor(eventId);
    setError("");

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          // Process image to 16:9 with blur fill
          const processedImage = await processImageToCardRatio(reader.result);

          // Send to backend
          const response = await axios.patch(
            `${API_BASE_URL}/events/${eventId}/image`,
            {
              userId,
              userRole,
              image: processedImage,
            },
          );

          if (response.data.success) {
            setSuccess("Image updated successfully!");
            // Refresh events list
            fetchMyEvents();
          }
        } catch (err) {
          setError(err.response?.data?.message || "Failed to update image");
        } finally {
          setUploadingImageFor(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Failed to process image");
      setUploadingImageFor(null);
    }
  };

  // Trigger file input click
  const triggerImageUpload = (eventId) => {
    setUploadingImageFor(eventId);
    fileInputRef.current?.click();
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && uploadingImageFor) {
      handleImageUpdate(uploadingImageFor, file);
    }
    // Reset file input
    e.target.value = "";
  };

  // Function to cancel a booking
  const handleCancelBooking = async (bookingId) => {
    // Ask user to confirm cancellation
    if (
      !window.confirm(
        "Are you sure you want to cancel this booking? You will get 50% refund.",
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await cancelBooking(bookingId);
      setSuccess("Booking cancelled successfully! 50% refund processed.");

      // Refresh bookings list
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel booking");
    } finally {
      setLoading(false);
    }
  };

  // Function to get color based on booking status
  const getStatusColor = (status) => {
    switch (status) {
      case "CONFIRMED":
        return "green";
      case "PAYMENT_PENDING":
        return "orange";
      case "CANCELLED":
        return "red";
      case "PAYMENT_FAILED":
        return "darkred";
      default:
        return "gray";
    }
  };

  return (
    <div className="my-bookings">
      <h2>My Dashboard</h2>

      {/* Toggle between bookings and events */}
      <div className="tab-toggle">
        <button
          className={`tab-btn ${activeTab === "bookings" ? "active" : ""}`}
          onClick={() => setActiveTab("bookings")}
        >
          My Bookings
        </button>
        {(userRole === "admin" || userRole === "superAdmin") && (
          <button
            className={`tab-btn ${activeTab === "events" ? "active" : ""}`}
            onClick={() => setActiveTab("events")}
          >
            My Events
          </button>
        )}
        {userRole === "superAdmin" && (
          <button
            className={`tab-btn ${activeTab === "admin-requests" ? "active" : ""}`}
            onClick={() => setActiveTab("admin-requests")}
          >
            Admin Requests
          </button>
        )}
      </div>

      {/* Refresh button */}
      <button
        onClick={() =>
          activeTab === "bookings" ? fetchBookings() : fetchMyEvents()
        }
        disabled={loading}
        className="refresh-btn"
      >
        {loading
          ? "Loading..."
          : activeTab === "bookings"
            ? "Refresh Bookings"
            : "Refresh Events"}
      </button>

      {/* Show error or success messages */}
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {/* Show loading skeleton */}
      {loading && activeTab === "bookings" && <MyBookingsSkeleton />}
      {loading && activeTab === "events" && <MyBookingsSkeleton />}

      {/* BOOKINGS TAB */}
      {activeTab === "bookings" && (
        <>
          {/* Show message if no bookings */}
          {!loading && bookings.length === 0 && (
            <p className="info">
              No bookings found. Book an event to see it here!
            </p>
          )}

          {/* Display all bookings */}
          <div className="bookings-list">
            {bookings.map((booking) => (
              <div
                key={booking._id}
                className="booking-card"
                style={{ display: "flex", gap: "20px", alignItems: "center" }}
              >
                <div style={{ flex: 1 }}>
                  <div className="booking-header">
                    <h3>Booking #{booking._id.slice(-6)}</h3>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: getStatusColor(booking.status),
                      }}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div className="booking-details">
                    <p>
                      <strong>Event:</strong>{" "}
                      {booking.event?.name || booking.event || "N/A"}
                    </p>
                    <p>
                      <strong>User:</strong>{" "}
                      {booking.user?.name || booking.user || "N/A"}
                    </p>
                    <p>
                      <strong>Seats:</strong>{" "}
                      {Array.isArray(booking.seats)
                        ? booking.seats.length
                        : booking.seats}
                    </p>
                    {booking.amount && (
                      <p>
                        <strong>Amount Paid:</strong> ₹{booking.amount}
                      </p>
                    )}
                    <p>
                      <strong>Created:</strong>{" "}
                      {new Date(booking.createdAt).toLocaleString("en-GB")}
                    </p>

                    {/* Show payment expiry if pending */}
                    {booking.paymentExpiresAt && (
                      <p>
                        <strong>Payment Expires:</strong>{" "}
                        {new Date(booking.paymentExpiresAt).toLocaleString(
                          "en-GB",
                        )}
                      </p>
                    )}
                  </div>

                  {/* Show cancel button only for confirmed bookings */}
                  {booking.status === "CONFIRMED" && (
                    <button
                      onClick={() => handleCancelBooking(booking._id)}
                      disabled={loading}
                      className="cancel-btn"
                    >
                      Cancel Booking (50% refund)
                    </button>
                  )}
                </div>

                {booking.event?.image && (
                  <div
                    style={{
                      width: "200px",
                      height: "280px",
                      backgroundImage: `url(${booking.event.image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      borderRadius: "8px",
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* EVENTS TAB */}
      {activeTab === "events" && (
        <>
          {/* Hidden file input for image upload */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleFileSelect}
          />

          {/* Show message if no events */}
          {!loading && myEvents.length === 0 && (
            <p className="info">
              No events created yet. Create an event to see it here!
            </p>
          )}

          {/* Display all created events */}
          <div className="bookings-list">
            {myEvents.map((event) => {
              // Check if user can update this event's image
              const isCreator = event.createdBy === userId;
              const isSuperAdmin = userRole === "superAdmin";
              const canUpdateImage = isSuperAdmin || isCreator;

              return (
                <div key={event._id} className="booking-card event-card">
                  {/* Event Image with Update Button */}
                  <div
                    className="event-image-container"
                    style={{ position: "relative" }}
                  >
                    {event.image ? (
                      <div
                        className="event-image"
                        style={{
                          backgroundImage: `url(${event.image})`,
                          height: "200px",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          borderRadius: "8px 8px 0 0",
                          marginBottom: "15px",
                        }}
                      />
                    ) : (
                      <div
                        className="event-image-placeholder"
                        style={{
                          height: "200px",
                          backgroundColor: "var(--background-tertiary)",
                          borderRadius: "8px 8px 0 0",
                          marginBottom: "15px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-secondary)",
                        }}
                      >
                        No Image
                      </div>
                    )}

                    {/* Change Image Button - Show for SuperAdmin or Creator */}
                    {canUpdateImage && (
                      <button
                        onClick={() => triggerImageUpload(event._id)}
                        disabled={uploadingImageFor === event._id}
                        className="change-image-btn"
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          padding: "8px 12px",
                          backgroundColor: "rgba(0, 0, 0, 0.7)",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor =
                            "rgba(37, 99, 235, 0.9)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
                        }}
                      >
                        {uploadingImageFor === event._id ? (
                          <>
                            <span className="spinner-small"></span>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                              <circle cx="12" cy="13" r="4" />
                            </svg>
                            {event.image ? "Change Image" : "Add Image"}
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="booking-header">
                    <h3>{event.name}</h3>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor:
                          event.type === "public" ? "#10b981" : "#f59e0b",
                      }}
                    >
                      {event.type === "public" ? "🌍 Public" : "🔒 Private"}
                    </span>
                  </div>

                  <div className="booking-details">
                    <div className="event-description">
                      <strong>Description:</strong>
                      <div className="description-text">
                        {event.description}
                      </div>
                    </div>
                    <p>
                      <strong>Event Date:</strong>{" "}
                      {new Date(event.eventDate).toLocaleString("en-GB")}
                    </p>
                    <p>
                      <strong>Event ID:</strong> <code>{event._id}</code>
                    </p>
                    <p>
                      <strong>Created:</strong>{" "}
                      {new Date(event.createdAt).toLocaleString("en-GB")}
                    </p>
                    <p>
                      <strong>Category:</strong>{" "}
                      {Array.isArray(event.category)
                        ? event.category.join(", ")
                        : event.category}
                    </p>
                    <p>
                      <strong>Platform Fee Paid:</strong> ₹
                      {event.creationCharge || 0}
                    </p>
                    <p>
                      <strong>Total Seats:</strong> {event.totalSeats}
                    </p>
                    <p>
                      <strong>Available Seats:</strong> {event.availableSeats}
                    </p>
                    <p>
                      <strong>Booked Seats:</strong>{" "}
                      {event.totalSeats - event.availableSeats}
                    </p>
                    <p>
                      <strong>Ticket Price:</strong> ₹{event.amount || 0}
                    </p>
                    <p className="total-collection">
                      <strong>Total Collection:</strong> ₹
                      {(event.totalSeats - event.availableSeats) *
                        (event.amount || 0)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Admin Requests Tab - Only for superAdmin */}
      {activeTab === "admin-requests" && userRole === "superAdmin" && (
        <AdminRequests />
      )}
    </div>
  );
}

export default MyBookings;
