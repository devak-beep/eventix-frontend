import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { PaymentPageSkeleton } from "./SkeletonLoader";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/api";

function formatDate(key) {
  if (!key) return "";
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { eventName, seats, passType, selectedDate, passPrice, amount } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // BUGFIX: Ref prevents race condition — updated sync before navigate (unmount)
  const paymentCompletedRef = useRef(false);
  const isProcessingRef     = useRef(false);

  // ── Load Razorpay script ────────────────────────────────────────────────────
  useEffect(() => {
    const script = document.createElement("script");
    script.src   = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  // ── Cleanup on unmount: release lock if payment not completed ──────────────
  useEffect(() => {
    return () => {
      if (!paymentCompletedRef.current && bookingId) {
        const data = JSON.stringify({ bookingId, error: "User navigated away" });
        navigator.sendBeacon?.(
          `${API_BASE_URL}/razorpay/payment-failed`,
          new Blob([data], { type: "application/json" }),
        );
        axios.post(`${API_BASE_URL}/razorpay/payment-failed`, { bookingId, error: "User navigated away" }).catch(() => {});
      }
    };
  }, [bookingId]);

  const handlePayment = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setLoading(true);
    setError("");

    try {
      // ── Create Razorpay order — amount comes from backend (pass-type aware) ──
      const orderResponse = await axios.post(`${API_BASE_URL}/razorpay/create-order`, { bookingId });
      const { orderId, amount: orderAmount, currency, keyId } = orderResponse.data;

      const options = {
        key:         keyId,
        amount:      orderAmount,
        currency,
        name:        "Eventix",
        description: `Booking for ${eventName || "Event"}`,
        order_id:    orderId,
        handler: async function (response) {
          try {
            const verifyResponse = await axios.post(`${API_BASE_URL}/razorpay/verify-payment`, {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              bookingId,
            });
            if (verifyResponse.data.success) {
              paymentCompletedRef.current = true;
              navigate("/booking/success", {
                state: {
                  bookingId,
                  eventName,
                  seats,
                  passType:     passType || "regular",
                  selectedDate: selectedDate || null,
                  amount:       verifyResponse.data.booking.amount,
                },
              });
            }
          } catch (err) {
            setError("Payment verification failed. Please contact support.");
          }
        },
        prefill: { name: "", email: "", contact: "" },
        theme:   { color: "#0070f3" },
        modal: {
          ondismiss: async function () {
            try {
              await axios.post(`${API_BASE_URL}/razorpay/payment-failed`, { bookingId, error: "Cancelled by user" });
              setError("Payment cancelled. Seats have been released.");
            } catch {}
            setLoading(false);
            isProcessingRef.current = false;
          },
        },
      };

      const rz = new window.Razorpay(options);
      rz.on("payment.failed", async function (response) {
        try {
          await axios.post(`${API_BASE_URL}/razorpay/payment-failed`, { bookingId, error: response.error.description });
          setError(`Payment failed: ${response.error.description || "Card declined"}. Seats have been released.`);
        } catch {}
        setLoading(false);
        isProcessingRef.current = false;
      });

      rz.open();
      setLoading(false);
      isProcessingRef.current = false;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to initiate payment");
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  const handleCancel = async () => {
    try {
      await axios.post(`${API_BASE_URL}/razorpay/payment-failed`, { bookingId, error: "Cancelled by user" });
    } catch {}
    navigate("/");
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const effectivePrice = passPrice ?? amount ?? 0;
  const totalDisplay   = effectivePrice * (seats || 0);

  const passLabel = () => {
    if (!passType || passType === "regular") return null;
    if (passType === "daily")  return `Day Pass — ${formatDate(selectedDate)}`;
    if (passType === "season") return "Season Pass (all days)";
    return null;
  };

  if (!eventName || !seats) return <PaymentPageSkeleton />;

  return (
    <div className="event-details">
      <div className="booking-section">
        <h3>Complete Payment</h3>
        {error && <div className="error">{error}</div>}

        <div className="booking-step">
          {eventName && <p><strong>Event:</strong> {eventName}</p>}
          {passLabel() && <p><strong>Pass:</strong> {passLabel()}</p>}
          <p><strong>Tickets:</strong> {seats}</p>
          <p><strong>Total Amount:</strong> ₹{totalDisplay}</p>
          <p><strong>Booking ID:</strong> {bookingId}</p>

          <button onClick={handlePayment} disabled={loading} style={{ marginTop: "20px" }}>
            {loading ? "Processing..." : "💳 Pay Now"}
          </button>

          <button onClick={handleCancel} style={{ marginTop: "10px", background: "#666" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;
