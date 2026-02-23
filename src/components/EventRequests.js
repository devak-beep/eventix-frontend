// This component shows pending event creation requests for admin/superAdmin
// They can approve or reject requests
import React, { useState, useEffect } from "react";
import { MyBookingsSkeleton } from "./SkeletonLoader";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";

function EventRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("PENDING");

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [processingId, setProcessingId] = useState(null);

  // Fetch event requests
  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const endpoint =
        filter === "PENDING"
          ? "/event-requests/admin/pending"
          : `/event-requests/admin/all?status=${filter}`;

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          "x-user-role": user.role,
          "x-user-id": user._id,
        },
      });
      const data = await response.json();

      if (data.success) {
        setRequests(data.requests || []);
      } else {
        setError(data.message || "Failed to fetch requests");
      }
    } catch (err) {
      setError("Failed to fetch event requests");
      console.error("Error fetching event requests:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch requests on mount and when filter changes
  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Handle approve request
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
            "x-user-id": user._id,
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
    } catch (err) {
      setError("Failed to approve request");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle reject request
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
            "x-user-id": user._id,
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
    } catch (err) {
      setError("Failed to reject request");
    } finally {
      setProcessingId(null);
    }
  };

  // Get status badge style
  const getStatusBadge = (status) => {
    const styles = {
      PENDING: { bg: "#fef3cd", color: "#856404", text: "⏳ Pending" },
      APPROVED: { bg: "#d4edda", color: "#155724", text: "✅ Approved" },
      REJECTED: { bg: "#f8d7da", color: "#721c24", text: "❌ Rejected" },
      PAYMENT_PENDING: {
        bg: "#cce5ff",
        color: "#004085",
        text: "💳 Payment Pending",
      },
      COMPLETED: {
        bg: "#d1ecf1",
        color: "#0c5460",
        text: "🎉 Event Published",
      },
      EXPIRED: { bg: "#e2e3e5", color: "#383d41", text: "⌛ Expired" },
    };
    const style = styles[status] || styles.PENDING;
    return (
      <span
        style={{
          background: style.bg,
          color: style.color,
          padding: "4px 10px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        {style.text}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <MyBookingsSkeleton />;
  }

  return (
    <div className="my-bookings-container">
      <h2 style={{ marginBottom: "20px" }}>📋 Event Creation Requests</h2>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        {[
          "PENDING",
          "APPROVED",
          "REJECTED",
          "PAYMENT_PENDING",
          "COMPLETED",
          "EXPIRED",
        ].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border:
                filter === status
                  ? "2px solid var(--primary-color)"
                  : "1px solid var(--border-color)",
              background:
                filter === status ? "var(--primary-color)" : "var(--card-bg)",
              color: filter === status ? "white" : "var(--text-primary)",
              cursor: "pointer",
              fontWeight: filter === status ? "600" : "400",
              transition: "all 0.2s",
            }}
          >
            {status.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Messages */}
      {error && (
        <div className="error-message" style={{ marginBottom: "15px" }}>
          {error}
        </div>
      )}
      {success && (
        <div className="success-message" style={{ marginBottom: "15px" }}>
          {success}
        </div>
      )}

      {/* Requests List */}
      {requests.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "var(--text-secondary)",
          }}
        >
          <p>
            No {filter.toLowerCase().replace("_", " ")} event requests found.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {requests.map((request) => (
            <div
              key={request._id}
              className="booking-card"
              style={{
                padding: "20px",
                borderRadius: "12px",
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
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
                        {formatDate(request.eventDate)}
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
                    <strong>Requested by:</strong>{" "}
                    {request.requestedBy?.name || "Unknown"} (
                    {request.requestedBy?.email})
                  </p>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "14px",
                      margin: "4px 0",
                    }}
                  >
                    <strong>Seats:</strong> {request.totalSeats} |{" "}
                    <strong>Type:</strong> {request.type} |{" "}
                    <strong>Ticket:</strong>{" "}
                    {formatCurrency(request.amount || 0)}
                  </p>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "14px",
                      margin: "4px 0",
                    }}
                  >
                    <strong>Platform Fee:</strong>{" "}
                    {formatCurrency(request.platformFee)}
                  </p>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "13px",
                      margin: "4px 0",
                    }}
                  >
                    Submitted: {formatDate(request.createdAt)}
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
                  {getStatusBadge(request.status)}

                  {request.status === "PENDING" && (
                    <div
                      style={{ display: "flex", gap: "8px", marginTop: "10px" }}
                    >
                      <button
                        className="submit-btn"
                        onClick={() => {
                          setSelectedRequest(request);
                          setAdminNote("");
                          setShowApproveModal(true);
                        }}
                        disabled={processingId === request._id}
                        style={{ padding: "8px 16px", fontSize: "14px" }}
                      >
                        ✅ Approve
                      </button>
                      <button
                        className="cancel-btn"
                        onClick={() => {
                          setSelectedRequest(request);
                          setAdminNote("");
                          setShowRejectModal(true);
                        }}
                        disabled={processingId === request._id}
                        style={{ padding: "8px 16px", fontSize: "14px" }}
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
                      background: "transparent",
                      border: "1px solid var(--border-color)",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: "var(--text-secondary)",
                      fontSize: "13px",
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>

              {/* Admin Note (if any) */}
              {request.adminNote && request.status !== "PENDING" && (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "10px",
                    background: "var(--bg-secondary)",
                    borderRadius: "6px",
                    borderLeft: `3px solid ${request.status === "REJECTED" ? "var(--danger-color)" : "var(--primary-color)"}`,
                  }}
                >
                  <small style={{ color: "var(--text-secondary)" }}>
                    <strong>Admin Note:</strong> {request.adminNote}
                    {request.reviewedBy && (
                      <span> — by {request.reviewedBy.name}</span>
                    )}
                  </small>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>✅ Approve Event Request</h3>
            <p>
              You're about to approve the event request for:
              <br />
              <strong>{selectedRequest.name}</strong>
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              The user will be notified to pay the platform fee of{" "}
              <strong>{formatCurrency(selectedRequest.platformFee)}</strong>.
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
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedRequest(null);
                }}
              >
                Cancel
              </button>
              <button
                className="submit-btn"
                onClick={handleApprove}
                disabled={processingId === selectedRequest._id}
              >
                {processingId === selectedRequest._id
                  ? "Approving..."
                  : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>❌ Reject Event Request</h3>
            <p>
              You're about to reject the event request for:
              <br />
              <strong>{selectedRequest.name}</strong>
            </p>
            <div className="form-group" style={{ marginTop: "15px" }}>
              <label>Reason for rejection *:</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Please provide a reason..."
                rows="3"
                style={{ width: "100%", resize: "vertical" }}
                required
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  background: "var(--danger-color)",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
                onClick={handleReject}
                disabled={processingId === selectedRequest._id}
              >
                {processingId === selectedRequest._id
                  ? "Rejecting..."
                  : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px" }}>
            <h3>📋 Event Request Details</h3>

            {selectedRequest.image && (
              <img
                src={selectedRequest.image}
                alt={selectedRequest.name}
                style={{
                  width: "100%",
                  maxHeight: "200px",
                  objectFit: "cover",
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
                <p
                  style={{
                    margin: "5px 0",
                    color: "var(--text-secondary)",
                    fontSize: "14px",
                  }}
                >
                  {selectedRequest.description || "No description provided"}
                </p>
              </div>
              <div>
                <strong>Event Date:</strong>{" "}
                {formatDate(selectedRequest.eventDate)}
              </div>
              <div>
                <strong>Total Seats:</strong> {selectedRequest.totalSeats}
              </div>
              <div>
                <strong>Event Type:</strong> {selectedRequest.type}
              </div>
              <div>
                <strong>Category:</strong>{" "}
                {selectedRequest.category?.join(", ") || "None"}
              </div>
              <div>
                <strong>Ticket Price:</strong>{" "}
                {formatCurrency(selectedRequest.amount || 0)}
              </div>
              <div>
                <strong>Platform Fee:</strong>{" "}
                {formatCurrency(selectedRequest.platformFee)}
              </div>
              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid var(--border-color)",
                }}
              />
              <div>
                <strong>Requested By:</strong>{" "}
                {selectedRequest.requestedBy?.name} (
                {selectedRequest.requestedBy?.email})
              </div>
              <div>
                <strong>Submitted:</strong>{" "}
                {formatDate(selectedRequest.createdAt)}
              </div>
              <div>
                <strong>Status:</strong>{" "}
                {getStatusBadge(selectedRequest.status)}
              </div>
              {selectedRequest.reviewedBy && (
                <div>
                  <strong>Reviewed By:</strong>{" "}
                  {selectedRequest.reviewedBy.name} on{" "}
                  {formatDate(selectedRequest.reviewedAt)}
                </div>
              )}
              {selectedRequest.adminNote && (
                <div>
                  <strong>Admin Note:</strong> {selectedRequest.adminNote}
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRequest(null);
                }}
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
