import React, { useState, useEffect } from "react";
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

  const handlePayment = async () => {
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
              await axios.post(`${API_BASE_URL}/razorpay/payment-failed`, {
                bookingId,
                error: "Payment cancelled by user",
              });
              if (lockId) {
                await axios.post(`${API_BASE_URL}/locks/${lockId}/cancel`);
              }
              setError("Payment cancelled. Seats have been released.");
            } catch (err) {
              console.error("Failed to release lock on dismiss:", err);
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
          await axios.post(`${API_BASE_URL}/razorpay/payment-failed`, {
            bookingId,
            error: response.error.description,
          });
          if (lockId) {
            await axios.post(`${API_BASE_URL}/locks/${lockId}/cancel`);
          }
          setError(
            `Payment failed: ${response.error.description || "Card declined"}. Seats have been released.`,
          );
        } catch (err) {
          console.error("Failed to release lock on payment failure:", err);
          setError("Payment failed. Seats have been released.");
        }
        setLoading(false);
      });

      razorpay.open();
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to initiate payment");
      setLoading(false);
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
                // Release the booking
                await axios.post(`${API_BASE_URL}/razorpay/payment-failed`, {
                  bookingId,
                  error: "Cancelled by user",
                });
                // Release the seat lock
                if (lockId) {
                  await axios.post(`${API_BASE_URL}/locks/${lockId}/cancel`);
                }
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
