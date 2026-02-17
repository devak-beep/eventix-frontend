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

          <button onClick={() => navigate('/my-bookings')} style={{ marginTop: '20px' }}>
            View My Bookings
          </button>

          <button 
            onClick={() => navigate('/')} 
            style={{ marginTop: '10px', background: '#666' }}
          >
            Back to Events
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookingSuccessPage;
