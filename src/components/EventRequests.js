// This component shows pending event creation requests for admin/superAdmin
// They can approve or reject requests
import React, { useState, useEffect } from "react";
import { MyBookingsSkeleton } from "./SkeletonLoader";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (dateString) =>
  new Date(dateString).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const fmtDate = (dateString) =>
  new Date(dateString).toLocaleDateString("en-IN", { dateStyle: "medium" });

const fmtCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);

const daysBetween = (start, end) =>
  Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;

// ─── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING:         { bg: "#fef3cd", color: "#856404",  text: "⏳ Pending",         short: "Pending" },
  APPROVED:        { bg: "#d4edda", color: "#155724",  text: "✅ Approved",        short: "Approved" },
  REJECTED:        { bg: "#f8d7da", color: "#721c24",  text: "❌ Rejected",        short: "Rejected" },
  PAYMENT_PENDING: { bg: "#cce5ff", color: "#004085",  text: "💳 Pay Pending",     short: "Pay Pending" },
  COMPLETED:       { bg: "#d1ecf1", color: "#0c5460",  text: "🎉 Published",       short: "Published" },
  EXPIRED:         { bg: "#e2e3e5", color: "#383d41",  text: "⌛ Expired",         short: "Expired" },
};

const TAB_ORDER = ["PENDING", "APPROVED", "REJECTED", "PAYMENT_PENDING", "COMPLETED", "EXPIRED"];

function EventRequests() {
  const [requests,      setRequests]      = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [success,       setSuccess]       = useState("");
  const [filter,        setFilter]        = useState("PENDING");

  // Modal states
  const [showApproveModal,  setShowApproveModal]  = useState(false);
  const [showRejectModal,   setShowRejectModal]   = useState(false);
  const [showDetailsModal,  setShowDetailsModal]  = useState(false);
  const [selectedRequest,   setSelectedRequest]   = useState(null);
  const [adminNote,         setAdminNote]         = useState("");
  const [processingId,      setProcessingId]      = useState(null);

  // ── Fetch requests ─────────────────────────────────────────────────────────
  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const user     = JSON.parse(localStorage.getItem("user") || "{}");
      const endpoint =
        filter === "PENDING"
          ? "/event-requests/admin/pending"
          : `/event-requests/admin/all?status=${filter}`;

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { "x-user-role": user.role, "x-user-id": user._id },
      });
      const data = await response.json();

      if (data.success) {
        setRequests(data.requests || []);
      } else {
        setError(data.message || "Failed to fetch requests");
      }
    } catch (err) {
      setError("Failed to fetch event requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!selectedRequest) return;
    setProcessingId(selectedRequest._id);
    setError("");

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const response = await fetch(
        `${API_BASE_URL}/event-requests/${selectedRequest._id}/approve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-role": user.role,
            "x-user-id":   user._id,
          },
          body: JSON.stringify({
            adminNote: adminNote || "Your event request has been approved!",
          }),
        },
      );
      const data = await response.json();

      if (data.success) {
        setSuccess(`Request for "${selectedRequest.name}" approved!`);
        setShowApproveModal(false);
        setSelectedRequest(null);
        setAdminNote("");
        fetchRequests();
        setTimeout(() => setSuccess(""), 5000);
      } else {
        setError(data.message || "Failed to approve request");
      }
    } catch {
      setError("Failed to approve request");
    } finally {
      setProcessingId(null);
    }
  };

  // ── Reject ─────────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!adminNote.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }

    setProcessingId(selectedRequest._id);
    setError("");

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const response = await fetch(
        `${API_BASE_URL}/event-requests/${selectedRequest._id}/reject`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-role": user.role,
            "x-user-id":   user._id,
          },
          body: JSON.stringify({ adminNote }),
        },
      );
      const data = await response.json();

      if (data.success) {
        setSuccess(`Request for "${selectedRequest.name}" rejected.`);
        setShowRejectModal(false);
        setSelectedRequest(null);
        setAdminNote("");
        fetchRequests();
        setTimeout(() => setSuccess(""), 5000);
      } else {
        setError(data.message || "Failed to reject request");
      }
    } catch {
      setError("Failed to reject request");
    } finally {
      setProcessingId(null);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
    return (
      <span
        style={{
          background:   cfg.bg,
          color:        cfg.color,
          padding:      "4px 10px",
          borderRadius: "12px",
          fontSize:     "12px",
          fontWeight:   "600",
          whiteSpace:   "nowrap",
        }}
      >
        {cfg.text}
      </span>
    );
  };

  const getEventDateDisplay = (req) => {
    if (req.eventType === "multi-day" && req.endDate) {
      return `${fmtDate(req.eventDate)} → ${fmtDate(req.endDate)} (${daysBetween(req.eventDate, req.endDate)} days)`;
    }
    return fmt(req.eventDate);
  };

  if (loading) return <MyBookingsSkeleton />;

  return (
    <div className="my-bookings-container">
      <h2 style={{ marginBottom: "20px" }}>📋 Event Creation Requests</h2>

      {/* ── Filter Tabs ─── horizontal scroll, compact ──────────────────── */}
      <div
        style={{
          display:                 "flex",
          gap:                     "6px",
          marginBottom:            "20px",
          overflowX:               "auto",
          paddingBottom:           "6px",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth:          "none",
          msOverflowStyle:         "none",
        }}
      >
        {TAB_ORDER.map((status) => {
          const active = filter === status;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding:      "6px 14px",
                borderRadius: "20px",
                border:       active
                  ? "2px solid var(--accent-primary)"
                  : "1px solid var(--border-color)",
                background:   active ? "var(--accent-primary)" : "var(--bg-card)",
                color:        active ? "white" : "var(--text-secondary)",
                cursor:       "pointer",
                fontWeight:   active ? "700" : "500",
                fontSize:     "12px",
                whiteSpace:   "nowrap",
                flexShrink:   0,
                transition:   "all 0.2s",
              }}
            >
              {STATUS_CONFIG[status]?.short || status.replace("_", " ")}
            </button>
          );
        })}
      </div>

      {/* ── Messages ────────────────────────────────────────────────────── */}
      {error   && <div className="error-message"   style={{ marginBottom: "15px" }}>{error}</div>}
      {success && <div className="success-message" style={{ marginBottom: "15px" }}>{success}</div>}

      {/* ── Requests list ───────────────────────────────────────────────── */}
      {requests.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding:   "40px",
            color:     "var(--text-secondary)",
          }}
        >
          <p>No {STATUS_CONFIG[filter]?.short.toLowerCase()} event requests found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {requests.map((request) => (
            <div
              key={request._id}
              className="booking-card"
              style={{
                padding:      "20px",
                borderRadius: "12px",
                background:   "var(--bg-card)",
                border:       "1px solid var(--border-color)",
              }}
            >
              {/* ── Card header row ──────────────────────────────────── */}
              <div
                style={{
                  display:        "flex",
                  justifyContent: "space-between",
                  alignItems:     "flex-start",
                  flexWrap:       "wrap",
                  gap:            "12px",
                }}
              >
                {/* Left: Event Info */}
                <div style={{ flex: "1", minWidth: "200px" }}>
                  <div
                    style={{
                      display:     "flex",
                      alignItems:  "center",
                      gap:         "10px",
                      marginBottom: "8px",
                    }}
                  >
                    {request.image && (
                      <img
                        src={request.image}
                        alt={request.name}
                        style={{
                          width:        "56px",
                          height:       "38px",
                          objectFit:    "cover",
                          borderRadius: "6px",
                          flexShrink:   0,
                        }}
                      />
                    )}
                    <div>
                      <h3 style={{ margin: 0, fontSize: "15px" }}>{request.name}</h3>
                      {request.eventType === "multi-day" && (
                        <span
                          style={{
                            fontSize:     "10px",
                            fontWeight:   "700",
                            background:   "linear-gradient(135deg,#8b5cf6,#6d28d9)",
                            color:        "white",
                            padding:      "2px 8px",
                            borderRadius: "10px",
                            marginTop:    "3px",
                            display:      "inline-block",
                          }}
                        >
                          📆 Multi-Day
                        </span>
                      )}
                    </div>
                  </div>

                  <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "4px 0" }}>
                    <strong>📅</strong> {getEventDateDisplay(request)}
                  </p>
                  <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "4px 0" }}>
                    <strong>By:</strong> {request.requestedBy?.name || "Unknown"}{" "}
                    ({request.requestedBy?.email})
                  </p>
                  <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "4px 0" }}>
                    <strong>Seats:</strong> {request.totalSeats} &nbsp;|&nbsp;
                    <strong>Type:</strong> {request.type}
                    {request.eventType === "single-day" && (
                      <>&nbsp;|&nbsp;<strong>Ticket:</strong> {fmtCurrency(request.amount || 0)}</>
                    )}
                  </p>
                  {request.eventType === "multi-day" && request.passOptions && (
                    <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "4px 0" }}>
                      {request.passOptions.dailyPass?.enabled && (
                        <span>🎫 Day Pass: {fmtCurrency(request.passOptions.dailyPass.price)}/day &nbsp;</span>
                      )}
                      {request.passOptions.seasonPass?.enabled && (
                        <span>🏆 Season: {fmtCurrency(request.passOptions.seasonPass.price)}</span>
                      )}
                    </p>
                  )}
                  <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "4px 0" }}>
                    <strong>Platform Fee:</strong> {fmtCurrency(request.platformFee)}
                  </p>
                  <p style={{ color: "var(--text-tertiary)", fontSize: "12px", margin: "4px 0" }}>
                    Submitted: {fmt(request.createdAt)}
                  </p>
                </div>

                {/* Right: Status & Actions */}
                <div
                  style={{
                    display:       "flex",
                    flexDirection: "column",
                    alignItems:    "flex-end",
                    gap:           "8px",
                    flexShrink:    0,
                  }}
                >
                  {getStatusBadge(request.status)}

                  {request.status === "PENDING" && (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button
                        className="submit-btn"
                        onClick={() => {
                          setSelectedRequest(request);
                          setAdminNote("");
                          setShowApproveModal(true);
                        }}
                        disabled={processingId === request._id}
                        style={{ padding: "7px 14px", fontSize: "13px" }}
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setAdminNote("");
                          setShowRejectModal(true);
                        }}
                        disabled={processingId === request._id}
                        style={{
                          padding:      "7px 14px",
                          fontSize:     "13px",
                          background:   "rgba(239,68,68,0.12)",
                          color:        "#ef4444",
                          border:       "1px solid rgba(239,68,68,0.35)",
                          borderRadius: "8px",
                          cursor:       "pointer",
                          fontWeight:   "600",
                          transition:   "all 0.2s",
                        }}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowDetailsModal(true);
                    }}
                    style={{
                      background:   "transparent",
                      border:       "1px solid var(--border-color)",
                      padding:      "5px 12px",
                      borderRadius: "6px",
                      cursor:       "pointer",
                      color:        "var(--text-secondary)",
                      fontSize:     "12px",
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>

              {/* Admin note */}
              {request.adminNote && request.status !== "PENDING" && (
                <div
                  style={{
                    marginTop:   "14px",
                    padding:     "10px",
                    background:  "var(--bg-secondary)",
                    borderRadius: "6px",
                    borderLeft:  `3px solid ${request.status === "REJECTED" ? "#ef4444" : "var(--accent-primary)"}`,
                  }}
                >
                  <small style={{ color: "var(--text-secondary)" }}>
                    <strong>Admin Note:</strong> {request.adminNote}
                    {request.reviewedBy && <span> — by {request.reviewedBy.name}</span>}
                  </small>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ================================================================
          APPROVE MODAL
      ================================================================ */}
      {showApproveModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>✅ Approve Event Request</h3>
            <p>
              You're about to approve:<br />
              <strong>{selectedRequest.name}</strong>
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              The user will be notified to pay the platform fee of{" "}
              <strong>{fmtCurrency(selectedRequest.platformFee)}</strong>.
            </p>
            <div className="form-group" style={{ marginTop: "15px" }}>
              <label>Add a note (optional):</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Your event request has been approved!"
                rows="2"
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>
            <div
              style={{
                display:        "flex",
                gap:            "10px",
                justifyContent: "flex-end",
                marginTop:      "20px",
                flexWrap:       "wrap",
              }}
            >
              <button
                className="cancel-btn"
                onClick={() => { setShowApproveModal(false); setSelectedRequest(null); }}
                style={{ minWidth: "90px" }}
              >
                Cancel
              </button>
              <button
                className="submit-btn"
                onClick={handleApprove}
                disabled={processingId === selectedRequest._id}
                style={{ minWidth: "90px" }}
              >
                {processingId === selectedRequest._id ? "Approving…" : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          REJECT MODAL
      ================================================================ */}
      {showRejectModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ color: "#ef4444" }}>❌ Reject Event Request</h3>
            <p>
              You're about to reject:<br />
              <strong>{selectedRequest.name}</strong>
            </p>
            <div className="form-group" style={{ marginTop: "15px" }}>
              <label>Reason for rejection <span style={{ color: "#ef4444" }}>*</span></label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Please provide a reason for the rejection..."
                rows="3"
                style={{
                  width:       "100%",
                  resize:      "vertical",
                  borderColor: adminNote.trim() ? "var(--border-color)" : "rgba(239,68,68,0.4)",
                }}
                required
              />
              {!adminNote.trim() && (
                <small style={{ color: "#ef4444" }}>A reason is required</small>
              )}
            </div>

            {/* Error inside modal */}
            {error && (
              <div style={{ color: "#ef4444", fontSize: "13px", marginBottom: "8px" }}>{error}</div>
            )}

            {/* Action buttons — side by side, Cancel left, Reject right */}
            <div
              style={{
                display:        "flex",
                gap:            "10px",
                marginTop:      "20px",
                flexWrap:       "wrap",
              }}
            >
              <button
                onClick={() => { setShowRejectModal(false); setSelectedRequest(null); setError(""); }}
                style={{
                  flex:         "1",
                  minWidth:     "90px",
                  padding:      "10px 16px",
                  borderRadius: "8px",
                  border:       "1px solid var(--border-color)",
                  background:   "var(--bg-secondary)",
                  color:        "var(--text-primary)",
                  cursor:       "pointer",
                  fontWeight:   "600",
                  fontSize:     "14px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processingId === selectedRequest._id}
                style={{
                  flex:         "1",
                  minWidth:     "90px",
                  padding:      "10px 16px",
                  borderRadius: "8px",
                  border:       "none",
                  background:   processingId === selectedRequest._id
                    ? "#999"
                    : "linear-gradient(135deg, #ef4444, #dc2626)",
                  color:        "white",
                  cursor:       processingId === selectedRequest._id ? "not-allowed" : "pointer",
                  fontWeight:   "700",
                  fontSize:     "14px",
                  boxShadow:    "0 4px 12px rgba(239,68,68,0.3)",
                }}
              >
                {processingId === selectedRequest._id ? "Rejecting…" : "❌ Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          DETAILS MODAL
      ================================================================ */}
      {showDetailsModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "620px" }}>
            <h3>📋 Event Request Details</h3>

            {selectedRequest.image && (
              <img
                src={selectedRequest.image}
                alt={selectedRequest.name}
                style={{
                  width:        "100%",
                  maxHeight:    "200px",
                  objectFit:    "cover",
                  borderRadius: "8px",
                  marginBottom: "15px",
                }}
              />
            )}

            <div style={{ display: "grid", gap: "10px" }}>
              <div>
                <strong>Event Name:</strong> {selectedRequest.name}
              </div>

              <div>
                <strong>Description:</strong>
                <p style={{ margin: "5px 0", color: "var(--text-secondary)", fontSize: "14px" }}>
                  {selectedRequest.description || "No description provided"}
                </p>
              </div>

              {/* Duration pill */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <strong>Duration:</strong>
                <span
                  style={{
                    background:   selectedRequest.eventType === "multi-day"
                      ? "linear-gradient(135deg,#8b5cf6,#6d28d9)"
                      : "linear-gradient(135deg,#10b981,#059669)",
                    color:        "white",
                    padding:      "3px 10px",
                    borderRadius: "12px",
                    fontSize:     "12px",
                    fontWeight:   "600",
                  }}
                >
                  {selectedRequest.eventType === "multi-day" ? "📆 Multi-Day" : "🎯 Single Day"}
                </span>
              </div>

              <div>
                <strong>Start Date:</strong> {fmt(selectedRequest.eventDate)}
              </div>

              {selectedRequest.eventType === "multi-day" && selectedRequest.endDate && (
                <>
                  <div>
                    <strong>End Date:</strong> {fmtDate(selectedRequest.endDate)}
                  </div>
                  <div>
                    <strong>Total Days:</strong>{" "}
                    {daysBetween(selectedRequest.eventDate, selectedRequest.endDate)} days
                  </div>
                </>
              )}

              <div><strong>Total Seats:</strong> {selectedRequest.totalSeats}</div>
              <div><strong>Event Type:</strong> {selectedRequest.type}</div>
              <div>
                <strong>Category:</strong>{" "}
                {selectedRequest.category?.join(", ") || "None"}
              </div>

              {/* Pricing */}
              {selectedRequest.eventType === "single-day" ? (
                <div>
                  <strong>Ticket Price:</strong>{" "}
                  {fmtCurrency(selectedRequest.amount || 0)}
                </div>
              ) : (
                <div
                  style={{
                    padding:      "12px",
                    background:   "var(--bg-secondary)",
                    borderRadius: "8px",
                    border:       "1px solid var(--border-color)",
                  }}
                >
                  <strong style={{ display: "block", marginBottom: "8px" }}>
                    🎟️ Pass Options:
                  </strong>
                  {selectedRequest.passOptions?.dailyPass?.enabled ? (
                    <p style={{ margin: "4px 0", color: "var(--text-secondary)", fontSize: "14px" }}>
                      🎫 <strong>Day Pass:</strong>{" "}
                      {fmtCurrency(selectedRequest.passOptions.dailyPass.price)} / day
                    </p>
                  ) : (
                    <p style={{ margin: "4px 0", color: "var(--text-tertiary)", fontSize: "13px" }}>
                      🎫 Day Pass: not offered
                    </p>
                  )}
                  {selectedRequest.passOptions?.seasonPass?.enabled ? (
                    <p style={{ margin: "4px 0", color: "var(--text-secondary)", fontSize: "14px" }}>
                      🏆 <strong>Season Pass:</strong>{" "}
                      {fmtCurrency(selectedRequest.passOptions.seasonPass.price)} (full event)
                    </p>
                  ) : (
                    <p style={{ margin: "4px 0", color: "var(--text-tertiary)", fontSize: "13px" }}>
                      🏆 Season Pass: not offered
                    </p>
                  )}
                </div>
              )}

              <div>
                <strong>Platform Fee:</strong> {fmtCurrency(selectedRequest.platformFee)}
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--border-color)" }} />

              <div>
                <strong>Requested By:</strong>{" "}
                {selectedRequest.requestedBy?.name} ({selectedRequest.requestedBy?.email})
              </div>
              <div>
                <strong>Submitted:</strong> {fmt(selectedRequest.createdAt)}
              </div>
              <div>
                <strong>Status:</strong> {getStatusBadge(selectedRequest.status)}
              </div>

              {selectedRequest.reviewedBy && (
                <div>
                  <strong>Reviewed By:</strong>{" "}
                  {selectedRequest.reviewedBy.name} on{" "}
                  {fmt(selectedRequest.reviewedAt)}
                </div>
              )}

              {selectedRequest.adminNote && (
                <div
                  style={{
                    padding:      "10px",
                    background:   "var(--bg-secondary)",
                    borderRadius: "6px",
                    borderLeft:   `3px solid ${selectedRequest.status === "REJECTED" ? "#ef4444" : "var(--accent-primary)"}`,
                  }}
                >
                  <strong>Admin Note:</strong> {selectedRequest.adminNote}
                </div>
              )}
            </div>

            <div
              style={{
                display:        "flex",
                justifyContent: "flex-end",
                marginTop:      "20px",
                gap:            "10px",
                flexWrap:       "wrap",
              }}
            >
              {/* Allow approve/reject from detail modal for PENDING requests */}
              {selectedRequest.status === "PENDING" && (
                <>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setAdminNote("");
                      setShowRejectModal(true);
                    }}
                    style={{
                      padding:      "8px 16px",
                      borderRadius: "8px",
                      border:       "none",
                      background:   "rgba(239,68,68,0.12)",
                      color:        "#ef4444",
                      cursor:       "pointer",
                      fontWeight:   "600",
                      fontSize:     "13px",
                    }}
                  >
                    ❌ Reject
                  </button>
                  <button
                    className="submit-btn"
                    onClick={() => {
                      setShowDetailsModal(false);
                      setAdminNote("");
                      setShowApproveModal(true);
                    }}
                    style={{ padding: "8px 16px", fontSize: "13px" }}
                  >
                    ✅ Approve
                  </button>
                </>
              )}
              <button
                className="cancel-btn"
                onClick={() => { setShowDetailsModal(false); setSelectedRequest(null); }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventRequests;
