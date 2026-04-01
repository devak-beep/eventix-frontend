import React from "react";
import { useNavigate } from "react-router-dom";
import { MyBookingsSkeleton } from "./SkeletonLoader";

export default function MyRequestsTab({ myEventRequests, loadingRequests, payingForRequest, payPlatformFee }) {
  const navigate = useNavigate();
  return (
    <div className="my-requests-section">
      {loadingRequests ? (
        <MyBookingsSkeleton />
      ) : myEventRequests.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
          <p>You haven't submitted any event requests yet.</p>
          <button className="submit-btn" onClick={() => navigate("/request-event")} style={{ marginTop: "15px" }}>📝 Request to Create Event</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {myEventRequests.map((request) => {
            const isApproved = request.status === "APPROVED";
            const isPaymentPending = request.status === "PAYMENT_PENDING";
            const canPay = isApproved || isPaymentPending;
            const isExpired = request.status === "EXPIRED";
            const isCompleted = request.status === "COMPLETED";
            const isRejected = request.status === "REJECTED";
            let timeRemaining = null;
            if (canPay && request.paymentExpiresAt) {
              const diff = new Date(request.paymentExpiresAt) - new Date();
              if (diff > 0) {
                timeRemaining = `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
              }
            }
            return (
              <div key={request._id} style={{ padding: "20px", borderRadius: "12px", background: "var(--card-bg)", border: `1px solid ${isRejected ? "var(--danger-color)" : isCompleted ? "var(--success-color)" : canPay ? "var(--primary-color)" : "var(--border-color)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "15px" }}>
                  <div style={{ flex: "1", minWidth: "250px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      {request.image && <img src={request.image} alt={request.name} style={{ width: "60px", height: "40px", objectFit: "cover", borderRadius: "6px" }} />}
                      <div>
                        <h3 style={{ margin: 0 }}>{request.name}</h3>
                        <small style={{ color: "var(--text-secondary)" }}>{new Date(request.eventDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small>
                      </div>
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: "8px 0" }}>
                      <strong>Seats:</strong> {request.totalSeats} | <strong>Type:</strong> {request.type}
                      {request.eventType !== "multi-day" && <> | <strong>Ticket:</strong> ₹{request.amount || 0}</>}
                    </p>
                    {request.eventType === "multi-day" && request.passOptions && (
                      <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: "4px 0" }}>
                        {request.passOptions.dailyPass?.enabled && <span>🎫 <strong>Day Pass:</strong> ₹{request.passOptions.dailyPass.price}/day &nbsp;</span>}
                        {request.passOptions.seasonPass?.enabled && <span>🏆 <strong>Season Pass:</strong> ₹{request.passOptions.seasonPass.price}</span>}
                      </p>
                    )}
                    <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "4px 0" }}>Submitted: {new Date(request.createdAt).toLocaleString("en-IN", { dateStyle: "medium" })}</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
                    <span style={{ padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", background: isCompleted ? "#d1ecf1" : isRejected ? "#f8d7da" : isExpired ? "#e2e3e5" : canPay ? "#d4edda" : "#fef3cd", color: isCompleted ? "#0c5460" : isRejected ? "#721c24" : isExpired ? "#383d41" : canPay ? "#155724" : "#856404" }}>
                      {isCompleted ? "🎉 Event Published" : isRejected ? "❌ Rejected" : isExpired ? "⌛ Expired" : canPay ? "✅ Approved - Pay Now" : "⏳ Pending Approval"}
                    </span>
                    {canPay && (
                      <>
                        {timeRemaining && <small style={{ color: "var(--warning-color)" }}>⏰ Pay within: {timeRemaining}</small>}
                        <button className="submit-btn" onClick={() => payPlatformFee(request)} disabled={payingForRequest === request._id} style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: "8px" }}>
                          {payingForRequest === request._id ? "Processing..." : <>💳 Pay ₹{request.platformFee} to Create Event</>}
                        </button>
                      </>
                    )}
                    {isCompleted && request.createdEventId && (
                      <button className="submit-btn" onClick={() => navigate(`/event/${request.createdEventId._id || request.createdEventId}`)} style={{ padding: "8px 16px" }}>View Event</button>
                    )}
                  </div>
                </div>
                {request.adminNote && (
                  <div style={{ marginTop: "15px", padding: "10px", background: "var(--bg-secondary)", borderRadius: "6px", borderLeft: `3px solid ${isRejected ? "var(--danger-color)" : "var(--primary-color)"}` }}>
                    <small style={{ color: "var(--text-secondary)" }}>
                      <strong>{isRejected ? "Rejection Reason:" : "Admin Note:"}</strong> {request.adminNote}
                      {request.reviewedBy && <span> — by {request.reviewedBy.name || "Admin"}</span>}
                    </small>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
