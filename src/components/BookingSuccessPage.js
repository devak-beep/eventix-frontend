import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function BookingSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingId, eventName, seats, amount, passType, selectedDate } = location.state || {};

  const passLabel = () => {
    if (passType === 'daily' && selectedDate) {
      const d = new Date(selectedDate);
      return `🎟️ Day Pass — ${d.toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
      })}`;
    }
    if (passType === 'season') return '🌟 Season Pass (all days)';
    return null;
  };

  const label = passLabel();

  return (
    <div className="event-details">
      <div className="booking-section">
        <div className="success-message">
          <h2>✅ Booking Confirmed!</h2>
          <p>Your payment was successful and your seats are locked in.</p>

          <div className="booking-details">
            <p><strong>Booking ID:</strong> {bookingId}</p>
            {eventName && <p><strong>Event:</strong> {eventName}</p>}
            {label && (
              <p>
                <strong>Pass:</strong>{' '}
                <span style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: '20px',
                  background: passType === 'season'
                    ? 'linear-gradient(135deg, #a78bfa, #7c3aed)'
                    : 'linear-gradient(135deg, #34d399, #059669)',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '13px',
                }}>
                  {label}
                </span>
              </p>
            )}
            <p><strong>Seats Booked:</strong> {seats}</p>
            <p><strong>Amount Paid:</strong> ₹{amount}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px' }}>
            <button
              onClick={() => navigate('/bookings')}
              style={{ padding: '12px 24px', fontSize: '16px', fontWeight: '500' }}
            >
              📋 View My Bookings
            </button>

            <button
              onClick={() => navigate('/')}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                background: '#666',
                fontWeight: '500',
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
