import React from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/api";

export default function BookingsTab({
  bookings, loading, userRole,
  processingBookingId, setProcessingBookingId,
  cancelling, openCancelModal,
  fetchBookings, setSuccess, setError,
  getStatusColor,
}) {
  const navigate = useNavigate();
  return (
    <>
      {!loading && bookings.length === 0 && (
        <p className="info">No bookings found. Book an event to see it here!</p>
      )}
      <div className="bookings-list">
        {bookings.map((booking) => (
          <div key={booking._id} className="booking-card">
            {booking.event?.image && (
              <div className="booking-image-wrapper">
                <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${booking.event.image})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(20px) brightness(0.7)", transform: "scale(1.1)" }} />
                <img src={booking.event.image} alt={booking.event?.name || "Event"} style={{ position: "relative", maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>
            )}
            <div className="booking-header">
              <h3>{booking.event?.name || booking.event || "Event"}</h3>
              <span className="status-badge" style={{ backgroundColor: getStatusColor(booking.status) }}>{booking.status}</span>
            </div>
            <div className="booking-details">
              <p><strong>Transaction ID:</strong> <code>#{booking._id.slice(-6)}</code></p>
              <p><strong>Booking ID:</strong> <code>{booking._id}</code></p>
              {(userRole === "admin" || userRole === "superAdmin") && booking.event?._id && (
                <p><strong>Event ID:</strong> <code>{booking.event?._id}</code></p>
              )}
              <p><strong>User:</strong> {booking.user?.name || booking.user || "N/A"}</p>
              {(userRole === "admin" || userRole === "superAdmin") && booking.user?._id && (
                <p><strong>User ID:</strong> <code>{booking.user?._id}</code></p>
              )}
              <p><strong>Seats:</strong> {Array.isArray(booking.seats) ? booking.seats.length : booking.seats}</p>
              {booking.passType && booking.passType !== "regular" && (
                <p><strong>Pass:</strong>{" "}
                  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: "20px", background: booking.passType === "season" ? "linear-gradient(135deg, #a78bfa, #7c3aed)" : "linear-gradient(135deg, #34d399, #059669)", color: "#fff", fontWeight: "600", fontSize: "12px" }}>
                    {booking.passType === "daily" && booking.selectedDate
                      ? `🎟️ Day Pass — ${new Date(booking.selectedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                      : "🌟 Season Pass (all days)"}
                  </span>
                </p>
              )}
              {booking.amount && <p><strong>Amount Paid:</strong> ₹{booking.amount}</p>}
              <p><strong>Created:</strong> {new Date(booking.createdAt).toLocaleString("en-GB")}</p>
              {booking.status === "PAYMENT_PENDING" && booking.paymentExpiresAt && (
                <p style={{ color: new Date(booking.paymentExpiresAt) < new Date() ? "#ef4444" : "#f59e0b", fontWeight: "bold", padding: "8px", background: new Date(booking.paymentExpiresAt) < new Date() ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)", borderRadius: "6px", marginTop: "8px" }}>
                  {new Date(booking.paymentExpiresAt) < new Date()
                    ? "⚠️ Payment window expired! Seats will be released."
                    : `⏰ Complete payment before: ${new Date(booking.paymentExpiresAt).toLocaleString("en-GB")}`}
                </p>
              )}
              {booking.status !== "PAYMENT_PENDING" && booking.paymentExpiresAt && (
                <p><strong>Payment Expires:</strong> {new Date(booking.paymentExpiresAt).toLocaleString("en-GB")}</p>
              )}
            </div>
            {booking.status === "PAYMENT_PENDING" && (
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button onClick={() => navigate(`/booking/payment/${booking._id}`, { state: { eventId: booking.event?._id || booking.event, seats: Array.isArray(booking.seats) ? booking.seats.length : booking.seats, eventName: booking.event?.name || "Event", amount: booking.event?.amount || 100, lockId: booking.seatLockId?._id || booking.seatLockId, passType: booking.passType || "regular", selectedDate: booking.selectedDate || null } })} className="pay-now-btn" style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>
                  💳 Pay Now
                </button>
                <button onClick={async () => {
                  if (processingBookingId === booking._id) return;
                  setProcessingBookingId(booking._id);
                  try {
                    await axios.post(`${API_BASE_URL}/razorpay/payment-failed`, { bookingId: booking._id, error: "Cancelled by user from dashboard" });
                    setSuccess("Booking cancelled, seats released.");
                    fetchBookings();
                  } catch { setError("Failed to cancel booking"); }
                  finally { setProcessingBookingId(null); }
                }} disabled={processingBookingId === booking._id} className="cancel-pending-btn" style={{ background: processingBookingId === booking._id ? "#999" : "#666", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: processingBookingId === booking._id ? "not-allowed" : "pointer" }}>
                  {processingBookingId === booking._id ? "Cancelling..." : "Cancel"}
                </button>
              </div>
            )}
            {booking.status === "CONFIRMED" && (
              <button onClick={() => openCancelModal(booking)} disabled={cancelling} className="cancel-btn">
                Cancel Booking (50% refund)
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
