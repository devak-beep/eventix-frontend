// Payment Page - Step 3 of booking
import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { processPayment } from '../api';
import { v4 as uuidv4 } from 'uuid';

function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { eventId, seats, eventName, amount } = location.state || {};

  const handlePayment = async (status) => {
    setError('');
    setLoading(true);

    try {
      const idempotencyKey = uuidv4();
      await processPayment(bookingId, { status, idempotencyKey });
      
      // Navigate to result page
      navigate(`/booking/result/${bookingId}`, {
        state: { status, eventId, seats, eventName, amount }
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="event-details">
      <button onClick={() => navigate('/')} className="back-btn">← Back to Events</button>

      <div className="booking-section">
        <h3>💳 Process Payment</h3>

        {error && <div className="error">{error}</div>}

        <div className="booking-step">
          <div className="payment-summary">
            <h4>Booking Summary</h4>
            {eventName && <p><strong>Event:</strong> {eventName}</p>}
            <p><strong>Booking ID:</strong> <code>{bookingId}</code></p>
            <p><strong>Seats:</strong> {seats}</p>
            {amount !== undefined && (
              <>
                <p><strong>Price per ticket:</strong> ₹{amount}</p>
                <p className="total-amount">Total Amount: ₹{amount * seats}</p>
              </>
            )}
          </div>
          
          <p style={{marginTop: '24px', marginBottom: '16px', color: '#b8bcc8'}}>Choose payment option:</p>
          
          <div className="payment-buttons">
            <button 
              onClick={() => handlePayment('SUCCESS')} 
              disabled={loading}
              className="success-btn"
            >
              {loading ? 'Processing...' : '💳 Pay Now'}
            </button>
            <button 
              onClick={() => handlePayment('FAILURE')} 
              disabled={loading}
              className="failure-btn"
            >
              {loading ? 'Processing...' : '❌ Simulate Failure'}
            </button>
            <button 
              onClick={() => handlePayment('TIMEOUT')} 
              disabled={loading}
              className="timeout-btn"
            >
              {loading ? 'Processing...' : '⏱️ Simulate Timeout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;
