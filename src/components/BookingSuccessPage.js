import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function BookingSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingId, eventName, seats, amount } = location.state || {};

  return (
    <div className="event-details">
      <div className="booking-section">
        <div className="success-message">
          <h2>✅ Booking Confirmed!</h2>
          <p>Your payment was successful.</p>

          <div className="booking-details">
            <p><strong>Booking ID:</strong> {bookingId}</p>
            {eventName && <p><strong>Event:</strong> {eventName}</p>}
            <p><strong>Seats:</strong> {seats}</p>
            <p><strong>Amount Paid:</strong> ₹{amount}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px' }}>
            <button 
              onClick={() => navigate('/bookings')} 
              style={{ 
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              📋 View My Bookings
            </button>

            <button 
              onClick={() => navigate('/')} 
              style={{ 
                padding: '12px 24px',
                fontSize: '16px',
                background: '#666',
                fontWeight: '500'
              }}
            >
              🏠 Back to Events
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingSuccessPage;
