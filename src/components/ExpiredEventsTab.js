import React from "react";
import { MyBookingsSkeleton } from "./SkeletonLoader";

export default function ExpiredEventsTab({ expiredEvents, loadingExpired, userRole }) {
  if (userRole !== "admin" && userRole !== "superAdmin") return null;
  return (
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
              <div key={event._id} className="booking-card event-card">
                <div className="event-image-container" style={{ position: "relative" }}>
                  {event.image ? (
                    <div className="event-image" style={{ backgroundImage: `url(${event.image})`, height: "200px", backgroundSize: "cover", backgroundPosition: "center", borderRadius: "8px 8px 0 0", marginBottom: "15px" }} />
                  ) : (
                    <div className="event-image-placeholder" style={{ height: "200px", backgroundColor: "var(--background-tertiary)", borderRadius: "8px 8px 0 0", marginBottom: "15px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>No Image</div>
                  )}
                </div>
                <div className="booking-header" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h3 style={{ flex: 1 }}>{event.name}</h3>
                  <span className="status-badge" style={{ backgroundColor: "#6b7280" }}>⏰ Expired</span>
                  <span className="status-badge" style={{ backgroundColor: event.type === "public" ? "#10b981" : "#f59e0b" }}>{event.type === "public" ? "🌍 Public" : "🔒 Private"}</span>
                </div>
                <div className="booking-details">
                  {event.description && <div className="event-description"><strong>Description:</strong><div className="description-text">{event.description}</div></div>}
                  <p><strong>Event Date:</strong>{" "}{isMultiDay && event.endDate ? `${new Date(event.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(event.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : new Date(event.eventDate).toLocaleString("en-GB")}</p>
                  <p><strong>Event ID:</strong> <code>{event._id}</code></p>
                  {event.createdBy && <p><strong>Created By:</strong> {event.createdBy.name} (<code>{event.createdBy._id}</code>)</p>}
                  {event.approvedBy && <p><strong>Approved By:</strong> {event.approvedBy.name} (<code>{event.approvedBy._id}</code>)</p>}
                  <p><strong>Created:</strong> {new Date(event.createdAt).toLocaleString("en-GB")}</p>
                  <p><strong>Category:</strong> {Array.isArray(event.category) ? event.category.join(", ") : event.category}</p>
                  <p><strong>Platform Fee Paid:</strong> ₹{event.creationCharge || 0}</p>
                  <p><strong>Total Seats:</strong> {event.totalSeats}</p>
                  <p><strong>Available Seats:</strong> {event.availableSeats}</p>
                  <p><strong>Booked Seats:</strong> {bookedSeats}</p>
                  <p><strong>Ticket Price:</strong>{" "}{isMultiDay ? (<span style={{ display: "inline-flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}><span>🎟️ Day Pass: {(event.passOptions?.dailyPass?.price ?? 0) > 0 ? `₹${event.passOptions.dailyPass.price}` : "Free"}</span><span style={{ opacity: 0.4 }}>|</span><span>🌟 Season Pass: {(event.passOptions?.seasonPass?.price ?? 0) > 0 ? `₹${event.passOptions.seasonPass.price}` : "Free"}</span></span>) : (event.amount || 0) > 0 ? `₹${event.amount}` : "Free"}</p>
                  <p className="total-collection"><strong>Total Collection:</strong>{" "}{totalRevenue !== null ? <span style={{ color: "#10b981", fontWeight: "600" }}>₹{totalRevenue}</span> : "N/A (varies by pass type)"}</p>
                  {event.createdViaRequest && (
                    <div style={{ marginTop: "12px", padding: "10px", background: "var(--bg-secondary)", borderRadius: "8px", borderLeft: "3px solid var(--primary-color)" }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "13px" }}><strong>📝 Created via Request</strong></p>
                      {event.approvedBy && <p style={{ margin: "0", fontSize: "13px", color: "var(--text-secondary)" }}>Approved by: <strong>{event.approvedBy.name}</strong></p>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
