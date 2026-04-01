import { getUser, setUser } from "../utils/localStorage";
// This component shows all bookings made by users
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAllBookings, cancelBooking, getUserById, getExpiredEvents } from "../api";
import { MyBookingsSkeleton } from "./SkeletonLoader";
import AdminRequests from "./AdminRequests";
import EventRequests from "./EventRequests";
import ConfirmModal from "./ConfirmModal";
import BookingsTab from "./BookingsTab";
import EventsTab from "./EventsTab";
import ExpiredEventsTab from "./ExpiredEventsTab";
import MyRequestsTab from "./MyRequestsTab";
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
        const savedUser = getUser() || {};
        if (savedUser.role !== freshRole) {
          savedUser.role = freshRole;
          setUser(savedUser);
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
      const user = getUser() || {};
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
      const user = getUser() || {};

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
              Expired Events
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
              Expired Events
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
        <BookingsTab
          bookings={bookings} loading={loading} userRole={userRole}
          processingBookingId={processingBookingId} setProcessingBookingId={setProcessingBookingId}
          cancelling={cancelling} openCancelModal={openCancelModal}
          fetchBookings={fetchBookings} setSuccess={setSuccess} setError={setError}
          getStatusColor={getStatusColor}
        />

      {/* EVENTS TAB */}
      {activeTab === "events" && (
        <EventsTab
          myEvents={myEvents} loading={loading} userId={userId} userRole={userRole}
          uploadingImageFor={uploadingImageFor} triggerImageUpload={triggerImageUpload}
          fileInputRef={fileInputRef} handleFileSelect={handleFileSelect}
          editEventId={editEventId} setEditEventId={setEditEventId}
          editName={editName} setEditName={setEditName}
          editDescription={editDescription} setEditDescription={setEditDescription}
          editCategory={editCategory} setEditCategory={setEditCategory}
          editTotalSeats={editTotalSeats} setEditTotalSeats={setEditTotalSeats}
          editAvailableSeats={editAvailableSeats} setEditAvailableSeats={setEditAvailableSeats}
          savingEdit={savingEdit} handleSaveEdit={handleSaveEdit} handleEditCategoryChange={handleEditCategoryChange}
          eventBookings={eventBookings} expandedEventId={expandedEventId}
          loadingBookingsFor={loadingBookingsFor} fetchEventBookings={fetchEventBookings}
          openDeleteModal={openDeleteModal}
        />
      )}

      {/* Expired Events Tab */}
      {activeTab === "expired-events" && (
        <ExpiredEventsTab expiredEvents={expiredEvents} loadingExpired={loadingExpired} userRole={userRole} />
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

      {/* My Event Requests Tab */}
      {activeTab === "my-requests" && (
        <MyRequestsTab
          myEventRequests={myEventRequests} loadingRequests={loadingRequests}
          payingForRequest={payingForRequest} payPlatformFee={payPlatformFee}
        />
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
