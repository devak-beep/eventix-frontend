// Confirm Booking Page - Step 2 of booking
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { confirmBooking, cancelLock } from '../api';

function ConfirmBookingPage() {
  const { lockId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);

  const { eventId, seats, expiresAt } = location.state || {};

  // Cancel lock when leaving the page
  useEffect(() => {
    let isNavigating = false;

    const handlePopState = async (e) => {
      if (!isNavigating && lockId) {
        // Push state back to prevent immediate navigation
        window.history.pushState(null, '', window.location.href);
        
        if (window.confirm('Going back will cancel your seat lock. Continue?')) {
          isNavigating = true;
          try {
            await cancelLock(lockId);
          } catch (err) {
            console.error('Failed to cancel lock:', err);
          }
          // Navigate using React Router instead of browser back
          navigate('/');
        }
      }
    };

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Your seat lock will be cancelled if you leave.';
      return e.returnValue;
    };

    // Push current state to enable popstate detection
    window.history.pushState(null, '', window.location.href);
    
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [lockId, navigate]);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.floor((expiry - now) / 1000);

      if (remaining <= 0) {
        setTimeRemaining(0);
        setError('Lock expired! Please lock seats again.');
        clearInterval(interval);
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleConfirmBooking = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await confirmBooking(lockId);
      
      // Navigate to payment page
      navigate(`/booking/payment/${response.booking._id}`, {
        state: { eventId, seats }
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to confirm booking');
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = async () => {
    if (window.confirm('Going back will cancel your seat lock. Continue?')) {
      try {
        await cancelLock(lockId);
        navigate('/');
      } catch (err) {
        console.error('Failed to cancel lock:', err);
        navigate('/');
      }
    }
  };

  return (
    <div className="event-details">
      <button onClick={handleBackClick} className="back-btn">← Back to Events</button>

      <div className="booking-section">
        <h3>Confirm Your Booking</h3>

        {error && <div className="error">{error}</div>}

        <div className="booking-step">
          <p>✅ Seats locked! Lock ID: <code>{lockId}</code></p>
          <p>Seats: <strong>{seats}</strong></p>
          
          {timeRemaining > 0 && (
            <div className="timer-container">
              <div className="timer">
                ⏱️ Time remaining: <span className="timer-value">
                  {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
                </span>
              </div>
              <div className="timer-bar">
                <div 
                  className="timer-progress" 
                  style={{ width: `${(timeRemaining / 300) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          <button onClick={handleConfirmBooking} disabled={loading || timeRemaining === 0}>
            {loading ? 'Processing...' : '✔️ Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmBookingPage;
