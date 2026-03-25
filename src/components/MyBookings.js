// This component shows all bookings made by users
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAllBookings, cancelBooking, getUserById, getExpiredEvents } from "../api";
import { MyBookingsSkeleton } from "./SkeletonLoader";
import AdminRequests from "./AdminRequests";
import EventRequests from "./EventRequests";
import ConfirmModal from "./ConfirmModal";
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
  const navigate = useNavigate();

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

  // Delete event state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Cancel booking modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Track which booking is being processed (prevents double-clicks)
  const [processingBookingId, setProcessingBookingId] = useState(null);

  // Event bookings state (for admin/superAdmin to see who booked)
  const [eventBookings, setEventBookings] = useState({}); // { eventId: [bookings] }
  const [expandedEventId, setExpandedEventId] = useState(null); // Which event's bookings are expanded
  const [loadingBookingsFor, setLoadingBookingsFor] = useState(null); // Loading state per event

  // My Event Requests state (for users to see their pending requests)
  const [myEventRequests, setMyEventRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [payingForRequest, setPayingForRequest] = useState(null); // Request ID being paid

  // Expired events state (admin/superAdmin only)
  const [expiredEvents, setExpiredEvents] = useState([]);
  const [loadingExpired, setLoadingExpired] = useState(false);

  // --- Inline edit state for event name/description/category/seats (per event) ---
  const [editEventId, setEditEventId] = useState(null); // event._id being edited
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState([]);
  const [editTotalSeats, setEditTotalSeats] = useState("");
  const [editAvailableSeats, setEditAvailableSeats] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Handle category checkbox changes (same logic as CreateEvent)
  const handleEditCategoryChange = (categoryValue) => {
    const multiSelectCategories = [
      "food-drink",
      "festivals-cultural",
      "dance-party",
    ];

    if (multiSelectCategories.includes(categoryValue)) {
      setEditCategory((prev) => {
        const filteredCategories = prev.filter((c) =>
          multiSelectCategories.includes(c),
        );
        return filteredCategories.includes(categoryValue)
          ? filteredCategories.filter((c) => c !== categoryValue)
          : [...filteredCategories, categoryValue];
      });
    } else {
      setEditCategory([categoryValue]);
    }
  };

  // Save handler for event details
  const handleSaveEdit = async (event) => {
    setSavingEdit(true);
    try {
      const payload = {
        userId,
        userRole,
        name: editName,
        description: editDescription,
        category: editCategory,
      };

      // Only superAdmin can update seats
      if (userRole === "superAdmin") {
        payload.totalSeats = parseInt(editTotalSeats);
        payload.availableSeats = parseInt(editAvailableSeats);
      }

      await axios.patch(`${API_BASE_URL}/events/${event._id}/details`, payload);
      setSuccess("Event details updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
      setEditEventId(null);
      fetchMyEvents();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update event details");
    } finally {
      setSavingEdit(false);
    }
  };

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
    } else if (activeTab === "events") {
      fetchMyEvents();
    } else if (activeTab === "my-requests") {
      fetchMyEventRequests();
    } else if (activeTab === "expired-events") {
      fetchExpiredEvents();
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
      console.log("Fetching events for userId:", userId, "role:", userRole);
      const response = await axios.get(
        `${API_BASE_URL}/events/my-events?userId=${userId}&userRole=${userRole}&t=${Date.now()}`,
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

  // Function to fetch bookings for a specific event (admin/superAdmin feature)
  const fetchEventBookings = async (eventId) => {
    // Toggle off if already expanded
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
      return;
    }

    // Check if we already have bookings cached
    if (eventBookings[eventId]) {
      setExpandedEventId(eventId);
      return;
    }

    setLoadingBookingsFor(eventId);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/bookings?eventId=${eventId}`,
      );
      const bookingsData = response.data.data || [];

      // Filter to only show CONFIRMED bookings
      const confirmedBookings = bookingsData.filter(
        (b) => b.status === "CONFIRMED",
      );

      setEventBookings((prev) => ({
        ...prev,
        [eventId]: confirmedBookings,
      }));
      setExpandedEventId(eventId);
    } catch (err) {
      console.error("Error fetching event bookings:", err);
      setError("Failed to load bookings for this event");
    } finally {
      setLoadingBookingsFor(null);
    }
  };

  // Function to fetch user's event creation requests
  const fetchMyEventRequests = async () => {    setLoadingRequests(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const response = await axios.get(
        `${API_BASE_URL}/event-requests/my-requests`,
        {
          headers: {
            "x-user-id": user._id,
            "x-user-role": user.role,
          },
        },
      );
      if (response.data.success) {
        setMyEventRequests(response.data.requests || []);
      }
    } catch (err) {
      console.error("Error fetching event requests:", err);
      setError("Failed to load event requests");
    } finally {
      setLoadingRequests(false);
    }
  };

  // Function to fetch expired events (admin/superAdmin only)
  const fetchExpiredEvents = async () => {
    setLoadingExpired(true);
    setError("");
    try {
      const response = await getExpiredEvents(userRole);
      setExpiredEvents(response.data || []);
    } catch (err) {
      setError("Failed to load expired events");
      console.error("Error fetching expired events:", err);
    } finally {
      setLoadingExpired(false);
    }
  };

  // Load Razorpay script for event request payment
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Function to pay platform fee for approved event request
  const payPlatformFee = async (request) => {
    setPayingForRequest(request._id);
    setError("");

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      // Create payment order
      const orderResponse = await axios.post(
        `${API_BASE_URL}/event-requests/${request._id}/create-order`,
        {},
        {
          headers: {
            "x-user-id": user._id,
            "x-user-role": user.role,
          },
        },
      );

      if (!orderResponse.data.success) {
        throw new Error(
          orderResponse.data.message || "Failed to create payment order",
        );
      }

      const { order } = orderResponse.data;

      // Open Razorpay checkout
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_yourkeyhere",
        amount: order.amount,
        currency: order.currency,
        name: "Eventix",
        description: `Platform Fee - ${request.name}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            // Verify payment and create event
            const verifyResponse = await axios.post(
              `${API_BASE_URL}/event-requests/${request._id}/verify-payment`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              {
                headers: {
                  "x-user-id": user._id,
                  "x-user-role": user.role,
                },
              },
            );

            if (verifyResponse.data.success) {
              setSuccess(`🎉 Event "${request.name}" created successfully!`);
              fetchMyEventRequests(); // Refresh list
              setTimeout(() => setSuccess(""), 5000);
            } else {
              setError("Payment verification failed");
            }
          } catch (err) {
            setError("Payment verification failed");
            console.error(err);
          } finally {
            setPayingForRequest(null);
          }
        },
        prefill: {
          name: user.name || "",
          email: user.email || "",
        },
        theme: {
          color: "#0070f3",
        },
        modal: {
          ondismiss: function () {
            setPayingForRequest(null);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response) {
        setError(
          `Payment failed: ${response.error.description || "Transaction declined"}`,
        );
        setPayingForRequest(null);
      });
      razorpay.open();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to initiate payment",
      );
      setPayingForRequest(null);
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
            // Auto-dismiss success message after 3 seconds
            setTimeout(() => setSuccess(""), 3000);
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

  // Open delete confirmation modal
  const openDeleteModal = (event) => {
    setEventToDelete(event);
    setDeleteModalOpen(true);
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setEventToDelete(null);
  };

  // Handle event deletion
  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;

    setDeleting(true);
    setError("");

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/events/${eventToDelete._id}`,
        {
          data: { userId, userRole },
        },
      );

      if (response.data.success) {
        setSuccess("Event deleted successfully!");
        setTimeout(() => setSuccess(""), 3000);
        closeDeleteModal();
        fetchMyEvents();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete event");
      closeDeleteModal();
    } finally {
      setDeleting(false);
    }
  };

  // Open cancel booking modal
  const openCancelModal = (booking) => {
    setBookingToCancel(booking);
    setCancelModalOpen(true);
  };

  // Close cancel booking modal
  const closeCancelModal = () => {
    setCancelModalOpen(false);
    setBookingToCancel(null);
  };

  // Function to cancel a booking (after modal confirmation)
  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;

    setCancelling(true);
    setError("");
    setSuccess("");

    try {
      await cancelBooking(bookingToCancel._id);
      setSuccess("Booking cancelled successfully! 50% refund processed.");

      // Refresh bookings list
      fetchBookings();
      closeCancelModal();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel booking");
      closeCancelModal();
    } finally {
      setCancelling(false);
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
      <h2>Dashboard</h2>

      {/* Toggle between bookings and events */}
      <div className="tab-toggle">
        <button
          className={`tab-btn ${activeTab === "bookings" ? "active" : ""}`}
          onClick={() => setActiveTab("bookings")}
        >
          My Bookings
        </button>
        {/* User: My Event Requests & Events Published */}
        {userRole === "user" && (
          <>
            <button
              className={`tab-btn ${activeTab === "my-requests" ? "active" : ""}`}
              onClick={() => setActiveTab("my-requests")}
            >
              My Event Requests
            </button>
            <button
              className={`tab-btn ${activeTab === "events" ? "active" : ""}`}
              onClick={() => setActiveTab("events")}
            >
              Events Published
            </button>
          </>
        )}
        {/* Admin: My Events (created/approved) */}
        {userRole === "admin" && (
          <>
            <button
              className={`tab-btn ${activeTab === "events" ? "active" : ""}`}
              onClick={() => setActiveTab("events")}
            >
              My Events
            </button>
            <button
              className={`tab-btn ${activeTab === "expired-events" ? "active" : ""}`}
              onClick={() => setActiveTab("expired-events")}
            >
              ⏰ Expired Events
            </button>
            <button
              className={`tab-btn ${activeTab === "event-requests" ? "active" : ""}`}
              onClick={() => setActiveTab("event-requests")}
            >
              Event Requests
            </button>
          </>
        )}
        {/* SuperAdmin: All Events */}
        {userRole === "superAdmin" && (
          <>
            <button
              className={`tab-btn ${activeTab === "events" ? "active" : ""}`}
              onClick={() => setActiveTab("events")}
            >
              All Events
            </button>
            <button
              className={`tab-btn ${activeTab === "expired-events" ? "active" : ""}`}
              onClick={() => setActiveTab("expired-events")}
            >
              ⏰ Expired Events
            </button>
            <button
              className={`tab-btn ${activeTab === "event-requests" ? "active" : ""}`}
              onClick={() => setActiveTab("event-requests")}
            >
              Event Requests
            </button>
            <button
              className={`tab-btn ${activeTab === "admin-requests" ? "active" : ""}`}
              onClick={() => setActiveTab("admin-requests")}
            >
              Admin Requests
            </button>
          </>
        )}
      </div>

      {/* Refresh button - only show for bookings, events, my-requests, and expired-events tabs */}
      {(activeTab === "bookings" ||
        activeTab === "events" ||
        activeTab === "my-requests" ||
        activeTab === "expired-events") && (
        <button
          onClick={() => {
            if (activeTab === "bookings") fetchBookings();
            else if (activeTab === "events") fetchMyEvents();
            else if (activeTab === "my-requests") fetchMyEventRequests();
            else if (activeTab === "expired-events") fetchExpiredEvents();
          }}
          disabled={loading || loadingRequests || loadingExpired}
          className="refresh-btn"
        >
          {loading || loadingRequests || loadingExpired
            ? "Loading..."
            : activeTab === "bookings"
              ? "Refresh Bookings"
              : activeTab === "events"
                ? "Refresh Events"
                : activeTab === "expired-events"
                  ? "Refresh Expired Events"
                  : "Refresh Requests"}
        </button>
      )}

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
              >
                <div className="booking-header">
                  <h3>{booking.event?.name || booking.event || "Event"}</h3>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: getStatusColor(booking.status),
                    }}
                  >
                    {booking.status}
                  </span>
                </div>

                {booking.event?.image && (
                  <img
                    src={booking.event.image}
                    alt={booking.event?.name || "Event"}
                    className="booking-event-image"
                  />
                )}

                <div className="booking-details">
                  <p>
                    <strong>Transaction ID:</strong> <code>#{booking._id.slice(-6)}</code>
                  </p>
                  <p>
                    <strong>Booking ID:</strong> <code>{booking._id}</code>
                  </p>
                  {(userRole === "admin" || userRole === "superAdmin") &&
                    booking.event?._id && (
                      <p>
                        <strong>Event ID:</strong>{" "}
                        <code>{booking.event?._id}</code>
                      </p>
                    )}
                  <p>
                    <strong>User:</strong>{" "}
                    {booking.user?.name || booking.user || "N/A"}
                  </p>
                  {(userRole === "admin" || userRole === "superAdmin") &&
                    booking.user?._id && (
                      <p>
                        <strong>User ID:</strong>{" "}
                        <code>{booking.user?._id}</code>
                      </p>
                    )}
                  <p>
                    <strong>Seats:</strong>{" "}
                    {Array.isArray(booking.seats)
                      ? booking.seats.length
                      : booking.seats}
                  </p>

                  {/* Pass type badge for multi-day events */}
                  {booking.passType && booking.passType !== "regular" && (
                    <p>
                      <strong>Pass:</strong>{" "}
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: "20px",
                          background:
                            booking.passType === "season"
                              ? "linear-gradient(135deg, #a78bfa, #7c3aed)"
                              : "linear-gradient(135deg, #34d399, #059669)",
                          color: "#fff",
                          fontWeight: "600",
                          fontSize: "12px",
                        }}
                      >
                        {booking.passType === "daily" && booking.selectedDate
                          ? `🎟️ Day Pass — ${new Date(booking.selectedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                          : "🌟 Season Pass (all days)"}
                      </span>
                    </p>
                  )}

                  {booking.amount && (
                    <p>
                      <strong>Amount Paid:</strong> ₹{booking.amount}
                    </p>
                  )}
                  <p>
                    <strong>Created:</strong>{" "}
                    {new Date(booking.createdAt).toLocaleString("en-GB")}
                  </p>

                  {/* Show payment expiry warning for pending bookings */}
                  {booking.status === "PAYMENT_PENDING" &&
                    booking.paymentExpiresAt && (
                      <p
                        style={{
                          color:
                            new Date(booking.paymentExpiresAt) < new Date()
                              ? "#ef4444"
                              : "#f59e0b",
                          fontWeight: "bold",
                          padding: "8px",
                          background:
                            new Date(booking.paymentExpiresAt) < new Date()
                              ? "rgba(239, 68, 68, 0.1)"
                              : "rgba(245, 158, 11, 0.1)",
                          borderRadius: "6px",
                          marginTop: "8px",
                        }}
                      >
                        {new Date(booking.paymentExpiresAt) < new Date()
                          ? "⚠️ Payment window expired! Seats will be released."
                          : `⏰ Complete payment before: ${new Date(booking.paymentExpiresAt).toLocaleString("en-GB")}`}
                      </p>
                    )}

                  {/* Show payment expiry for other statuses */}
                  {booking.status !== "PAYMENT_PENDING" &&
                    booking.paymentExpiresAt && (
                      <p>
                        <strong>Payment Expires:</strong>{" "}
                        {new Date(booking.paymentExpiresAt).toLocaleString(
                          "en-GB",
                        )}
                      </p>
                    )}
                </div>

                {/* Show Pay Now button for PAYMENT_PENDING bookings */}
                {booking.status === "PAYMENT_PENDING" && (
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "10px",
                    }}
                  >
                    <button
                      onClick={() => {
                        // Navigate to payment page with booking details
                        navigate(`/booking/payment/${booking._id}`, {
                          state: {
                            eventId: booking.event?._id || booking.event,
                            seats: Array.isArray(booking.seats)
                              ? booking.seats.length
                              : booking.seats,
                            eventName: booking.event?.name || "Event",
                            amount: booking.event?.amount || 100,
                            lockId:
                              booking.seatLockId?._id || booking.seatLockId,
                            passType: booking.passType || "regular",
                            selectedDate: booking.selectedDate || null,
                          },
                        });
                      }}
                      className="pay-now-btn"
                      style={{
                        background:
                          "linear-gradient(135deg, #10b981, #059669)",
                        color: "white",
                        border: "none",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      💳 Pay Now
                    </button>
                    <button
                      onClick={async () => {
                        // Prevent double-clicks
                        if (processingBookingId === booking._id) return;
                        setProcessingBookingId(booking._id);

                        try {
                          // Cancel the pending booking and release seats
                          await axios.post(
                            `${API_BASE_URL}/razorpay/payment-failed`,
                            {
                              bookingId: booking._id,
                              error: "Cancelled by user from dashboard",
                            },
                          );
                          setSuccess("Booking cancelled, seats released.");
                          fetchBookings();
                        } catch (err) {
                          setError("Failed to cancel booking");
                        } finally {
                          setProcessingBookingId(null);
                        }
                      }}
                      disabled={processingBookingId === booking._id}
                      className="cancel-pending-btn"
                      style={{
                        background:
                          processingBookingId === booking._id
                            ? "#999"
                            : "#666",
                        color: "white",
                        border: "none",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        cursor:
                          processingBookingId === booking._id
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {processingBookingId === booking._id
                        ? "Cancelling..."
                        : "Cancel"}
                    </button>
                  </div>
                )}

                {/* Show cancel button only for confirmed bookings */}
                {booking.status === "CONFIRMED" && (
                  <button
                    onClick={() => openCancelModal(booking)}
                    disabled={cancelling}
                    className="cancel-btn"
                  >
                    Cancel Booking (50% refund)
                  </button>
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
              // Check if user can update this event's image (superadmin: any, admin: created/approved, user: own)
              const isCreator =
                event.createdBy &&
                (event.createdBy?._id === userId || event.createdBy === userId);
              const isApprover =
                event.approvedBy &&
                (event.approvedBy?._id === userId ||
                  event.approvedBy === userId);
              const isSuperAdmin = userRole === "superAdmin";
              const isAdmin = userRole === "admin";
              let canUpdateImage = false;
              if (isSuperAdmin) {
                canUpdateImage = true;
              } else if (isAdmin && (isCreator || isApprover)) {
                canUpdateImage = true;
              } else if (userRole === "user" && isCreator) {
                canUpdateImage = true;
              }

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
                          left: "10px",
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
                          width: "auto",
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

                  <div
                    className="booking-header"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    {editEventId === event._id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={100}
                        style={{ fontSize: "1.2em", fontWeight: 600, flex: 1 }}
                        autoFocus
                      />
                    ) : (
                      <h3 style={{ flex: 1 }}>{event.name}</h3>
                    )}
                    {canUpdateImage && editEventId !== event._id && (
                      <button
                        onClick={() => {
                          setEditEventId(event._id);
                          setEditName(event.name);
                          setEditDescription(event.description);
                          setEditCategory(
                            Array.isArray(event.category)
                              ? event.category
                              : event.category
                                ? [event.category]
                                : [],
                          );
                          setEditTotalSeats(event.totalSeats || "");
                          setEditAvailableSeats(event.availableSeats || "");
                        }}
                        title="Edit event details"
                        style={{
                          background: "#3b82f6",
                          border: "none",
                          cursor: "pointer",
                          padding: "6px",
                          marginLeft: "8px",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
                    )}
                    {editEventId === event._id && (
                      <>
                        <button
                          onClick={() => handleSaveEdit(event)}
                          disabled={savingEdit}
                          style={{
                            background: "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            padding: "6px 14px",
                            marginLeft: "6px",
                            fontWeight: 600,
                            cursor: savingEdit ? "not-allowed" : "pointer",
                          }}
                        >
                          {savingEdit ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditEventId(null)}
                          disabled={savingEdit}
                          style={{
                            background: "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            padding: "6px 14px",
                            marginLeft: "6px",
                            fontWeight: 600,
                            cursor: savingEdit ? "not-allowed" : "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
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
                      {editEventId === event._id ? (
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          maxLength={1500}
                          rows={3}
                          style={{
                            width: "100%",
                            fontSize: "1em",
                            marginTop: "4px",
                          }}
                        />
                      ) : (
                        <div className="description-text">
                          {event.description}
                        </div>
                      )}
                    </div>
                    <p>
                      <strong>Event Date:</strong>{" "}
                      {new Date(event.eventDate).toLocaleString("en-GB")}
                    </p>
                    <p>
                      <strong>Event ID:</strong> <code>{event._id}</code>
                    </p>
                    {(userRole === "admin" || userRole === "superAdmin") && (
                      <>
                        {event.createdBy && (
                          <p>
                            <strong>Created By:</strong> {event.createdBy.name}{" "}
                            (<code>{event.createdBy?._id}</code>)
                          </p>
                        )}
                        {event.approvedBy && (
                          <p>
                            <strong>Approved By:</strong>{" "}
                            {event.approvedBy.name} (
                            <code>{event.approvedBy?._id}</code>)
                          </p>
                        )}
                      </>
                    )}
                    <p>
                      <strong>Created:</strong>{" "}
                      {new Date(event.createdAt).toLocaleString("en-GB")}
                    </p>
                    <div style={{ marginBottom: "12px" }}>
                      <strong style={{ display: "block", marginBottom: "8px" }}>
                        Category:
                      </strong>
                      {editEventId === event._id ? (
                        <div>
                          <div className="category-checkboxes">
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={editCategory.includes("food-drink")}
                                onChange={() =>
                                  handleEditCategoryChange("food-drink")
                                }
                              />
                              <span className="checkbox-text">
                                🍔 Food & Drink
                              </span>
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={editCategory.includes(
                                  "festivals-cultural",
                                )}
                                onChange={() =>
                                  handleEditCategoryChange("festivals-cultural")
                                }
                              />
                              <span className="checkbox-text">
                                🎊 Festivals & Cultural
                              </span>
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={editCategory.includes("dance-party")}
                                onChange={() =>
                                  handleEditCategoryChange("dance-party")
                                }
                              />
                              <span className="checkbox-text">
                                💃 Dance & Party
                              </span>
                            </label>
                          </div>
                          <label
                            style={{
                              display: "block",
                              marginBottom: "4px",
                              fontSize: "13px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Or select single category:
                          </label>
                          <select
                            value={
                              editCategory.find(
                                (c) =>
                                  ![
                                    "food-drink",
                                    "festivals-cultural",
                                    "dance-party",
                                  ].includes(c),
                              ) || ""
                            }
                            onChange={(e) =>
                              e.target.value &&
                              handleEditCategoryChange(e.target.value)
                            }
                            style={{
                              width: "100%",
                              padding: "6px 10px",
                              border: "1px solid #cbd5e1",
                              borderRadius: "4px",
                              fontSize: "14px",
                            }}
                          >
                            <option value="">-- Select Category --</option>
                            <option value="music-live">🎵 Concerts</option>
                            <option value="sports-live">
                              ⚽ Sports & Live
                            </option>
                            <option value="arts-theater">
                              🎭 Arts & Theater
                            </option>
                            <option value="comedy-show">😂 Comedy</option>
                            <option value="movies">🎬 Movies</option>
                          </select>
                        </div>
                      ) : (
                        <span>
                          {Array.isArray(event.category)
                            ? event.category.join(", ")
                            : event.category}
                        </span>
                      )}
                    </div>
                    <p>
                      <strong>Platform Fee Paid:</strong> ₹
                      {event.creationCharge || 0}
                    </p>
                    <p>
                      <strong>Total Seats:</strong>{" "}
                      {editEventId === event._id &&
                      userRole === "superAdmin" ? (
                        <input
                          type="number"
                          value={editTotalSeats}
                          onChange={(e) => setEditTotalSeats(e.target.value)}
                          min="1"
                          style={{
                            width: "120px",
                            padding: "4px 8px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                            fontSize: "14px",
                            marginLeft: "8px",
                          }}
                        />
                      ) : (
                        event.totalSeats
                      )}
                    </p>
                    <p>
                      <strong>Available Seats:</strong>{" "}
                      {editEventId === event._id &&
                      userRole === "superAdmin" ? (
                        <input
                          type="number"
                          value={editAvailableSeats}
                          onChange={(e) =>
                            setEditAvailableSeats(e.target.value)
                          }
                          min="0"
                          max={editTotalSeats}
                          style={{
                            width: "120px",
                            padding: "4px 8px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                            fontSize: "14px",
                            marginLeft: "8px",
                          }}
                        />
                      ) : (
                        event.availableSeats
                      )}
                    </p>
                    <p>
                      <strong>Booked Seats:</strong>{" "}
                      {event.totalSeats - event.availableSeats}
                      {eventBookings[event._id] &&
                        eventBookings[event._id].length !==
                          event.totalSeats - event.availableSeats && (
                          <span
                            style={{
                              color: "#ef4444",
                              fontSize: "12px",
                              marginLeft: "8px",
                            }}
                          >
                            ⚠️ (Actual confirmed:{" "}
                            {eventBookings[event._id].length})
                          </span>
                        )}
                    </p>
                    <p>
                      <strong>Ticket Price:</strong>{" "}
                      {event.eventType === "multi-day" ? (
                        <span style={{ display: "inline-flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                          <span>
                            🎟️ Day Pass:{" "}
                            {(event.passOptions?.dailyPass?.price ?? 0) > 0
                              ? `₹${event.passOptions.dailyPass.price}`
                              : "Free"}
                          </span>
                          <span style={{ opacity: 0.4 }}>|</span>
                          <span>
                            🌟 Season Pass:{" "}
                            {(event.passOptions?.seasonPass?.price ?? 0) > 0
                              ? `₹${event.passOptions.seasonPass.price}`
                              : "Free"}
                          </span>
                        </span>
                      ) : (event.amount || 0) > 0 ? (
                        `₹${event.amount}`
                      ) : (
                        "Free"
                      )}
                    </p>
                    <p className="total-collection">
                      <strong>Total Collection:</strong> ₹
                      {event.eventType === "multi-day"
                        ? "N/A (varies by pass type)"
                        : (event.totalSeats - event.availableSeats) * (event.amount || 0)}
                    </p>

                    {/* Show who created and approved for events created via request */}
                    {event.createdViaRequest && (
                      <div
                        style={{
                          marginTop: "12px",
                          padding: "10px",
                          background: "var(--bg-secondary)",
                          borderRadius: "8px",
                          borderLeft: "3px solid var(--primary-color)",
                        }}
                      >
                        <p style={{ margin: "0 0 4px 0", fontSize: "13px" }}>
                          <strong>📝 Created via Request</strong>
                        </p>
                        {event.approvedBy && (
                          <p
                            style={{
                              margin: "0",
                              fontSize: "13px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Approved by:{" "}
                            <strong>{event.approvedBy.name}</strong>
                          </p>
                        )}
                      </div>
                    )}

                    {/* View Bookings Button - Show who booked */}
                    <button
                      onClick={() => fetchEventBookings(event._id)}
                      disabled={loadingBookingsFor === event._id}
                      style={{
                        marginTop: "12px",
                        padding: "10px 20px",
                        background:
                          expandedEventId === event._id
                            ? "linear-gradient(135deg, #6366f1, #4f46e5)"
                            : "linear-gradient(135deg, #3b82f6, #2563eb)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor:
                          loadingBookingsFor === event._id ? "wait" : "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        width: "100%",
                        justifyContent: "center",
                      }}
                    >
                      {loadingBookingsFor === event._id ? (
                        "Loading..."
                      ) : expandedEventId === event._id ? (
                        <>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M18 15l-6-6-6 6" />
                          </svg>
                          Hide Bookings
                        </>
                      ) : (
                        <>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                          </svg>
                          View Bookings
                          {eventBookings[event._id]
                            ? ` (${eventBookings[event._id].length})`
                            : ` (${event.totalSeats - event.availableSeats})`}
                        </>
                      )}
                    </button>

                    {/* Bookings List - Expandable */}
                    {expandedEventId === event._id &&
                      eventBookings[event._id] && (
                        <div
                          style={{
                            marginTop: "16px",
                            padding: "16px",
                            background: "var(--background-secondary)",
                            borderRadius: "8px",
                            border: "1px solid var(--border-color)",
                          }}
                        >
                          <h4
                            style={{
                              margin: "0 0 12px 0",
                              color: "var(--text-primary)",
                            }}
                          >
                            📋 Confirmed Bookings (
                            {eventBookings[event._id].length})
                          </h4>

                          {eventBookings[event._id].length === 0 ? (
                            <p
                              style={{
                                color: "var(--text-secondary)",
                                margin: 0,
                              }}
                            >
                              No confirmed bookings yet.
                            </p>
                          ) : (
                            <div
                              style={{ maxHeight: "300px", overflowY: "auto" }}
                            >
                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "collapse",
                                  fontSize: "14px",
                                }}
                              >
                                <thead>
                                  <tr
                                    style={{
                                      background: "var(--background-tertiary)",
                                      textAlign: "left",
                                    }}
                                  >
                                    <th
                                      style={{
                                        padding: "10px",
                                        borderBottom:
                                          "1px solid var(--border-color)",
                                      }}
                                    >
                                      User
                                    </th>
                                    <th
                                      style={{
                                        padding: "10px",
                                        borderBottom:
                                          "1px solid var(--border-color)",
                                      }}
                                    >
                                      Email
                                    </th>
                                    <th
                                      style={{
                                        padding: "10px",
                                        borderBottom:
                                          "1px solid var(--border-color)",
                                      }}
                                    >
                                      Seats
                                    </th>
                                    <th
                                      style={{
                                        padding: "10px",
                                        borderBottom:
                                          "1px solid var(--border-color)",
                                      }}
                                    >
                                      Amount
                                    </th>
                                    <th
                                      style={{
                                        padding: "10px",
                                        borderBottom:
                                          "1px solid var(--border-color)",
                                      }}
                                    >
                                      Booked On
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {eventBookings[event._id].map((booking) => (
                                    <tr
                                      key={booking._id}
                                      style={{
                                        borderBottom:
                                          "1px solid var(--border-color)",
                                      }}
                                    >
                                      <td style={{ padding: "10px" }}>
                                        {booking.user?.name || "Unknown"}
                                      </td>
                                      <td
                                        style={{
                                          padding: "10px",
                                          color: "var(--text-secondary)",
                                        }}
                                      >
                                        {booking.user?.email || "N/A"}
                                      </td>
                                      <td
                                        style={{
                                          padding: "10px",
                                          fontWeight: "600",
                                        }}
                                      >
                                        {Array.isArray(booking.seats)
                                          ? booking.seats.length
                                          : booking.seats}
                                      </td>
                                      <td
                                        style={{
                                          padding: "10px",
                                          color: "#10b981",
                                        }}
                                      >
                                        ₹{booking.amount || 0}
                                      </td>
                                      <td
                                        style={{
                                          padding: "10px",
                                          color: "var(--text-secondary)",
                                          fontSize: "12px",
                                        }}
                                      >
                                        {new Date(
                                          booking.createdAt,
                                        ).toLocaleString("en-GB")}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                    {/* Delete Event Button - Show for SuperAdmin or Creator */}
                    {canUpdateImage && (
                      <button
                        onClick={() => openDeleteModal(event)}
                        className="delete-event-btn"
                        style={{
                          marginTop: "16px",
                          padding: "10px 20px",
                          background:
                            "linear-gradient(135deg, #ef4444, #dc2626)",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                          justifyContent: "center",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow =
                            "0 4px 12px rgba(239, 68, 68, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "none";
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                        Delete Event
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Expired Events Tab - For admin/superAdmin to review past events */}
      {activeTab === "expired-events" &&
        (userRole === "admin" || userRole === "superAdmin") && (
          <div className="expired-events-section">
            {loadingExpired ? (
              <MyBookingsSkeleton />
            ) : expiredEvents.length === 0 ? (
              <p className="info">No expired events found.</p>
            ) : (
              <div className="bookings-list">
                {expiredEvents.map((event) => {
                  const isMultiDay = event.eventType === "multi-day";
                  const bookedSeats = event.totalSeats - event.availableSeats;
                  const totalRevenue = isMultiDay ? null : bookedSeats * (event.amount || 0);

                  return (
                    <div
                      key={event._id}
                      className="booking-card event-card"
                    >
                      {event.image && (
                        <div
                          style={{
                            height: "200px",
                            backgroundImage: `url(${event.image})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            borderRadius: "8px 8px 0 0",
                            marginBottom: "15px",
                            position: "relative",
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              top: "10px",
                              right: "10px",
                              background: "rgba(107,114,128,0.9)",
                              color: "#fff",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "600",
                            }}
                          >
                            ⏰ Expired
                          </span>
                        </div>
                      )}
                      {!event.image && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            marginBottom: "8px",
                          }}
                        >
                          <span
                            style={{
                              background: "rgba(107,114,128,0.15)",
                              color: "#6b7280",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "600",
                            }}
                          >
                            ⏰ Expired
                          </span>
                        </div>
                      )}

                      <div className="booking-header">
                        <h3>{event.name}</h3>
                        <span
                          className="status-badge"
                          style={{ backgroundColor: event.type === "public" ? "#10b981" : "#f59e0b" }}
                        >
                          {event.type === "public" ? "🌍 Public" : "🔒 Private"}
                        </span>
                      </div>

                      <div className="booking-details">
                        <p>
                          <strong>Event ID:</strong> <code>{event._id}</code>
                        </p>
                        <p>
                          <strong>Date:</strong>{" "}
                          {isMultiDay && event.endDate
                            ? `${new Date(event.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(event.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                            : new Date(event.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        {event.createdBy && (
                          <p>
                            <strong>Organizer:</strong> {event.createdBy.name} ({event.createdBy.email})
                          </p>
                        )}
                        {event.approvedBy && (
                          <p>
                            <strong>Approved By:</strong> {event.approvedBy.name}
                          </p>
                        )}
                        <p>
                          <strong>Total Seats:</strong> {event.totalSeats}
                        </p>
                        <p>
                          <strong>Seats Sold:</strong> {bookedSeats} / {event.totalSeats}
                        </p>
                        <p>
                          <strong>Ticket Price:</strong>{" "}
                          {isMultiDay ? (
                            <span>
                              Day ₹{event.passOptions?.dailyPass?.price ?? 0} | Season ₹{event.passOptions?.seasonPass?.price ?? 0}
                            </span>
                          ) : (event.amount || 0) > 0 ? (
                            `₹${event.amount}`
                          ) : (
                            "Free"
                          )}
                        </p>
                        {totalRevenue !== null && (
                          <p>
                            <strong>Total Revenue:</strong>{" "}
                            <span style={{ color: "#10b981", fontWeight: "600" }}>
                              ₹{totalRevenue}
                            </span>
                          </p>
                        )}
                        <p>
                          <strong>Platform Fee Paid:</strong> ₹{event.creationCharge || 0}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      {/* Admin Requests Tab - Only for superAdmin */}
      {activeTab === "admin-requests" && userRole === "superAdmin" && (
        <AdminRequests />
      )}

      {/* Event Requests Tab - For admin/superAdmin to approve/reject event creation requests */}
      {activeTab === "event-requests" &&
        (userRole === "admin" || userRole === "superAdmin") && (
          <EventRequests />
        )}

      {/* My Event Requests Tab - For users to see their pending requests and pay */}
      {activeTab === "my-requests" && (
        <div className="my-requests-section">
          {loadingRequests ? (
            <MyBookingsSkeleton />
          ) : myEventRequests.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "var(--text-secondary)",
              }}
            >
              <p>You haven't submitted any event requests yet.</p>
              <button
                className="submit-btn"
                onClick={() => navigate("/request-event")}
                style={{ marginTop: "15px" }}
              >
                📝 Request to Create Event
              </button>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              {myEventRequests.map((request) => {
                const isApproved = request.status === "APPROVED";
                const isPaymentPending = request.status === "PAYMENT_PENDING";
                const canPay = isApproved || isPaymentPending;
                const isExpired = request.status === "EXPIRED";
                const isCompleted = request.status === "COMPLETED";
                const isRejected = request.status === "REJECTED";

                // Calculate time remaining for payment
                let timeRemaining = null;
                if (canPay && request.paymentExpiresAt) {
                  const expiresAt = new Date(request.paymentExpiresAt);
                  const now = new Date();
                  const diff = expiresAt - now;
                  if (diff > 0) {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor(
                      (diff % (1000 * 60 * 60)) / (1000 * 60),
                    );
                    timeRemaining = `${hours}h ${minutes}m`;
                  }
                }

                return (
                  <div
                    key={request._id}
                    style={{
                      padding: "20px",
                      borderRadius: "12px",
                      background: "var(--card-bg)",
                      border: `1px solid ${isRejected ? "var(--danger-color)" : isCompleted ? "var(--success-color)" : canPay ? "var(--primary-color)" : "var(--border-color)"}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "15px",
                      }}
                    >
                      {/* Left: Event Info */}
                      <div style={{ flex: "1", minWidth: "250px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "8px",
                          }}
                        >
                          {request.image && (
                            <img
                              src={request.image}
                              alt={request.name}
                              style={{
                                width: "60px",
                                height: "40px",
                                objectFit: "cover",
                                borderRadius: "6px",
                              }}
                            />
                          )}
                          <div>
                            <h3 style={{ margin: 0 }}>{request.name}</h3>
                            <small style={{ color: "var(--text-secondary)" }}>
                              {new Date(request.eventDate).toLocaleString(
                                "en-IN",
                                { dateStyle: "medium", timeStyle: "short" },
                              )}
                            </small>
                          </div>
                        </div>
                        <p
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "14px",
                            margin: "8px 0",
                          }}
                        >
                          <strong>Seats:</strong> {request.totalSeats} |{" "}
                          <strong>Type:</strong> {request.type} |{" "}
                          <strong>Ticket:</strong> ₹{request.amount || 0}
                        </p>
                        <p
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "13px",
                            margin: "4px 0",
                          }}
                        >
                          Submitted:{" "}
                          {new Date(request.createdAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                          })}
                        </p>
                      </div>

                      {/* Right: Status & Actions */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: "10px",
                        }}
                      >
                        {/* Status Badge */}
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            background: isCompleted
                              ? "#d1ecf1"
                              : isRejected
                                ? "#f8d7da"
                                : isExpired
                                  ? "#e2e3e5"
                                  : canPay
                                    ? "#d4edda"
                                    : "#fef3cd",
                            color: isCompleted
                              ? "#0c5460"
                              : isRejected
                                ? "#721c24"
                                : isExpired
                                  ? "#383d41"
                                  : canPay
                                    ? "#155724"
                                    : "#856404",
                          }}
                        >
                          {isCompleted
                            ? "🎉 Event Published"
                            : isRejected
                              ? "❌ Rejected"
                              : isExpired
                                ? "⌛ Expired"
                                : canPay
                                  ? "✅ Approved - Pay Now"
                                  : "⏳ Pending Approval"}
                        </span>

                        {/* Pay Now Button */}
                        {canPay && (
                          <>
                            {timeRemaining && (
                              <small style={{ color: "var(--warning-color)" }}>
                                ⏰ Pay within: {timeRemaining}
                              </small>
                            )}
                            <button
                              className="submit-btn"
                              onClick={() => payPlatformFee(request)}
                              disabled={payingForRequest === request._id}
                              style={{
                                padding: "10px 20px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              {payingForRequest === request._id ? (
                                "Processing..."
                              ) : (
                                <>
                                  💳 Pay ₹{request.platformFee} to Create Event
                                </>
                              )}
                            </button>
                          </>
                        )}

                        {/* View Created Event */}
                        {isCompleted && request.createdEventId && (
                          <button
                            className="submit-btn"
                            onClick={() =>
                              navigate(
                                `/event/${request.createdEventId._id || request.createdEventId}`,
                              )
                            }
                            style={{ padding: "8px 16px" }}
                          >
                            View Event
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Admin Note */}
                    {request.adminNote && (
                      <div
                        style={{
                          marginTop: "15px",
                          padding: "10px",
                          background: "var(--bg-secondary)",
                          borderRadius: "6px",
                          borderLeft: `3px solid ${isRejected ? "var(--danger-color)" : "var(--primary-color)"}`,
                        }}
                      >
                        <small style={{ color: "var(--text-secondary)" }}>
                          <strong>
                            {isRejected ? "Rejection Reason:" : "Admin Note:"}
                          </strong>{" "}
                          {request.adminNote}
                          {request.reviewedBy && (
                            <span>
                              {" "}
                              — by {request.reviewedBy.name || "Admin"}
                            </span>
                          )}
                        </small>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteEvent}
        title="Delete Event"
        message={`Are you sure you want to delete "${eventToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Event"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
      />

      {/* Cancel Booking Confirmation Modal */}
      <ConfirmModal
        isOpen={cancelModalOpen}
        onClose={closeCancelModal}
        onConfirm={handleCancelBooking}
        title="Cancel Booking"
        message={`Are you sure you want to cancel your booking for "${bookingToCancel?.event?.name || "this event"}"? You will receive a 50% refund.`}
        confirmText="Yes, Cancel Booking"
        cancelText="Keep Booking"
        type="warning"
        loading={cancelling}
      />
    </div>
  );
}

export default MyBookings;
