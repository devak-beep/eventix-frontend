import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { PaymentPageSkeleton } from "./SkeletonLoader";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";

function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { eventName, seats, amount, lockId } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // BUGFIX: Use ref instead of state to prevent race condition
  // State updates are async, but ref updates are sync
  // This ensures cleanup effect sees the correct value immediately
  const paymentCompletedRef = useRef(false);

  // Prevent double-clicks on Pay button
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Release seat lock when user navigates away without completing payment
  useEffect(() => {
    return () => {
      // Only release if payment was not completed and we have a bookingId
      // BUGFIX: Use ref.current (sync) instead of state (async) to prevent race condition
      if (!paymentCompletedRef.current && bookingId) {
        // Use sendBeacon for reliable cleanup on page unload
        // paymentFailed handles both booking status AND lock release atomically
        const data = JSON.stringify({
          bookingId,
          error: "User navigated away",
        });
        navigator.sendBeacon?.(
          `${API_BASE_URL}/razorpay/payment-failed`,
          new Blob([data], { type: "application/json" }),
        );

        // Also try axios as a fallback (won't work on page close but works on SPA navigation)
        axios
          .post(`${API_BASE_URL}/razorpay/payment-failed`, {
            bookingId,
            error: "User navigated away",
          })
          .catch(() => {});
      }
    };
  }, [bookingId]);

  const handlePayment = async () => {
    // Prevent double-clicks
    if (isProcessingRef.current) {
      console.log("Payment already processing, ignoring duplicate click");
      return;
    }

    isProcessingRef.current = true;
    setLoading(true);
    setError("");

    try {
      // Create Razorpay order
      const orderResponse = await axios.post(
        `${API_BASE_URL}/razorpay/create-order`,
        {
          bookingId,
        },
      );

      const { orderId, amount, currency, keyId } = orderResponse.data;

      // Razorpay options
      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: "Eventix",
        description: `Booking for ${eventName || "Event"}`,
        order_id: orderId,
        handler: async function (response) {
          try {
            // Verify payment
            const verifyResponse = await axios.post(
              `${API_BASE_URL}/razorpay/verify-payment`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: bookingId,
              },
            );

            if (verifyResponse.data.success) {
              // BUGFIX: Mark payment as completed SYNCHRONOUSLY using ref
              // This prevents the cleanup effect from releasing the lock
              // Must happen BEFORE navigate() which triggers unmount
              paymentCompletedRef.current = true;
              navigate("/booking/success", {
                state: {
                  bookingId,
                  eventName,
                  seats,
                  amount: verifyResponse.data.booking.amount,
                },
              });
            }
          } catch (err) {
            setError("Payment verification failed");
            console.error(err);
          }
        },
        prefill: {
          name: "",
          email: "",
          contact: "",
        },
        theme: {
          color: "#0070f3",
        },
        modal: {
          ondismiss: async function () {
            try {
              // paymentFailed handles both booking status update AND seat lock release
              // No need to call cancelLock separately (prevents race condition/double restore)
              await axios.post(`${API_BASE_URL}/razorpay/payment-failed`, {
                bookingId,
                error: "Payment cancelled by user",
              });
              setError("Payment cancelled. Seats have been released.");
            } catch (err) {
              console.error("Failed to handle payment cancellation:", err);
              setError("Payment cancelled.");
            }
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      // Handle card declined / explicit payment failure
      razorpay.on("payment.failed", async function (response) {
        try {
          // paymentFailed handles both booking status update AND seat lock release
          // No need to call cancelLock separately (prevents race condition/double restore)
          await axios.post(`${API_BASE_URL}/razorpay/payment-failed`, {
            bookingId,
            error: response.error.description,
          });
          setError(
            `Payment failed: ${response.error.description || "Card declined"}. Seats have been released.`,
          );
        } catch (err) {
          console.error("Failed to handle payment failure:", err);
          setError("Payment failed. Seats have been released.");
        }
        setLoading(false);
      });

      razorpay.open();
      setLoading(false);
      isProcessingRef.current = false; // Reset after Razorpay opens (user can close and retry)
    } catch (err) {
      setError(err.response?.data?.message || "Failed to initiate payment");
      setLoading(false);
      isProcessingRef.current = false; // Reset on error so user can retry
    }
  };

  // Show loading skeleton if no payment data
  if (!eventName || !seats || !amount) {
    return <PaymentPageSkeleton />;
  }

  return (
    <div className="event-details">
      <div className="booking-section">
        <h3>Complete Payment</h3>

        {error && <div className="error">{error}</div>}

        <div className="booking-step">
          {eventName && (
            <p>
              <strong>Event:</strong> {eventName}
            </p>
          )}
          <p>
            <strong>Seats:</strong> {seats}
          </p>
          <p>
            <strong>Total Amount:</strong> ₹{amount * seats}
          </p>
          <p>
            <strong>Booking ID:</strong> {bookingId}
          </p>

          <button
            onClick={handlePayment}
            disabled={loading}
            style={{ marginTop: "20px" }}
          >
            {loading ? "Processing..." : "💳 Pay Now"}
          </button>

          <button
            onClick={async () => {
              try {
                // paymentFailed handles both booking status update AND seat lock release
                // No need to call cancelLock separately (prevents race condition/double restore)
                await axios.post(`${API_BASE_URL}/razorpay/payment-failed`, {
                  bookingId,
                  error: "Cancelled by user",
                });
              } catch (err) {
                console.error("Cleanup on cancel failed:", err);
              }
              navigate("/");
            }}
            style={{ marginTop: "10px", background: "#666" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;
