// Booking Result Page - Final step
import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

function BookingResultPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { status } = location.state || {};

  const isSuccess = status === 'SUCCESS';
  const isTimeout = status === 'TIMEOUT';

  return (
    <div className="event-details">
      <div className="booking-section">
        <div className={`booking-step ${isSuccess ? 'success-complete' : isTimeout ? 'timeout-complete' : 'failure-complete'}`}>
          <div className="result-icon">
            {isSuccess ? '🎉' : isTimeout ? '⏱️' : '❌'}
          </div>
          <h3>
            {isSuccess ? 'Booking Complete!' : isTimeout ? 'Payment Pending' : 'Payment Failed'}
          </h3>
          <p>
            {isSuccess 
              ? 'Your booking has been confirmed successfully.' 
              : isTimeout
              ? 'Payment is pending. The booking will expire automatically if not completed within the time limit.'
              : 'Payment failed! Seats have been restored.'}
          </p>
          <p>Booking ID: <code>{bookingId}</code></p>
          
          <div className="action-buttons">
            <button onClick={() => navigate('/')} className="primary-btn">
              ← Back to Events
            </button>
            <button 
              onClick={() => navigate('/bookings')}
              className="secondary-btn"
            >
              View My Bookings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingResultPage;
