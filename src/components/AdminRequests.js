// This component shows pending admin requests for superAdmin to approve/reject
import React, { useState, useEffect } from "react";
import axios from "axios";
import { MyBookingsSkeleton } from "./SkeletonLoader";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";

function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch pending admin requests
  const fetchAdminRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const response = await axios.get(
        `${API_BASE_URL}/users/admin-requests/pending`,
        {
          headers: {
            "x-user-role": user.role,
            "x-user-id": user._id,
          },
        },
      );
      setRequests(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch admin requests");
      console.error("Error fetching admin requests:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch requests on mount
  useEffect(() => {
    fetchAdminRequests();
  }, []);

  // Handle approve request
  const handleApproveRequest = async () => {
    if (!selectedRequest) return;

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await axios.post(
        `${API_BASE_URL}/users/admin-requests/${selectedRequest._id}/approve`,
        {},
        {
          headers: {
            "x-user-role": user.role,
            "x-user-id": user._id,
          },
        },
      );

      setSuccess(
        `Admin request from ${selectedRequest.name} has been approved!`,
      );
      setShowApproveModal(false);
      setSelectedRequest(null);

      // Refresh requests list
      setTimeout(() => {
        fetchAdminRequests();
        setSuccess("");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve request");
      setShowApproveModal(false);
    }
  };

  // Handle reject request
  const handleRejectRequest = async () => {
    if (!selectedRequest) return;

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await axios.post(
        `${API_BASE_URL}/users/admin-requests/${selectedRequest._id}/reject`,
        { rejectionReason: rejectionReason || "No reason provided" },
        {
          headers: {
            "x-user-role": user.role,
            "x-user-id": user._id,
          },
        },
      );

      setSuccess(
        `Admin request from ${selectedRequest.name} has been rejected.`,
      );
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason("");

      // Refresh requests list
      setTimeout(() => {
        fetchAdminRequests();
        setSuccess("");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reject request");
      setShowRejectModal(false);
    }
  };

  const openApproveModal = (request) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  const openRejectModal = (request) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const closeModals = () => {
    setShowApproveModal(false);
    setShowRejectModal(false);
    setSelectedRequest(null);
    setRejectionReason("");
  };

  if (loading) {
    return <MyBookingsSkeleton />;
  }

  return (
    <div className="admin-requests-container">
      <div className="admin-requests-header">
        <h2>Pending Admin Requests</h2>
        <div className="request-count">
          {requests.length} {requests.length === 1 ? "request" : "requests"}
        </div>
      </div>

      {error && (
        <div className="error-alert">
          <span>{error}</span>
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {success && (
        <div className="success-alert">
          <span>✓ {success}</span>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Pending Requests</h3>
          <p>All admin requests have been processed.</p>
        </div>
      ) : (
        <div className="requests-grid">
          {requests.map((request) => (
            <div key={request._id} className="request-card">
              <div className="request-header">
                <div className="user-info">
                  <h3>{request.name}</h3>
                  <p className="user-email">{request.email}</p>
                </div>
                <div className="request-date">
                  {new Date(request.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="request-body">
                <p className="request-status">
                  Status: <span className="status-badge pending">Pending</span>
                </p>
                <p className="request-created">
                  Requested on {new Date(request.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="request-actions">
                <button
                  onClick={() => openApproveModal(request)}
                  className="btn btn-approve"
                  title="Approve this admin request"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => openRejectModal(request)}
                  className="btn btn-reject"
                  title="Reject this admin request"
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Approve Admin Request?</h3>
            <p>
              Are you sure you want to approve admin access for{" "}
              <strong>{selectedRequest.name}</strong> ({selectedRequest.email})?
            </p>
            <p className="modal-info">
              Their account will be activated with admin privileges immediately.
            </p>
            <div className="modal-actions">
              <button onClick={closeModals} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleApproveRequest}
                className="btn btn-approve"
              >
                Yes, Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Reject Admin Request?</h3>
            <p>
              Are you sure you want to reject the admin request from{" "}
              <strong>{selectedRequest.name}</strong> ({selectedRequest.email})?
            </p>
            <p className="modal-info">
              Their account will be deleted and they will need to re-register if
              they want to try again.
            </p>

            <div className="rejection-reason-group">
              <label htmlFor="rejection-reason">
                Rejection Reason (Optional):
              </label>
              <textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection (optional)"
                rows={3}
                className="rejection-textarea"
              />
            </div>

            <div className="modal-actions">
              <button onClick={closeModals} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleRejectRequest} className="btn btn-reject">
                Yes, Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminRequests;
