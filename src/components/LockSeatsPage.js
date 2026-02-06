// Lock Seats Page - Step 1 of booking
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getEventById, lockSeats, cancelLock } from '../api';
import { v4 as uuidv4 } from 'uuid';

function LockSeatsPage({ userId }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockCreated, setLockCreated] = useState(false);
  const [currentLockId, setCurrentLockId] = useState(null);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  // Warn user if they try to leave after locking seats
  useEffect(() => {
    if (lockCreated && currentLockId) {
      let isNavigating = false;

      const handlePopState = async (e) => {
        if (!isNavigating) {
          // Push state back to prevent immediate navigation
          window.history.pushState(null, '', window.location.href);
          
          if (window.confirm('Going back will cancel your seat lock. Continue?')) {
            isNavigating = true;
            try {
              await cancelLock(currentLockId);
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
        e.returnValue = 'You have locked seats. If you leave, your lock will be cancelled.';
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
    }
  }, [lockCreated, currentLockId, navigate]);

  const fetchEventDetails = async () => {
    setLoading(true);
    try {
      const response = await getEventById(eventId);
      setEvent(response.data);
    } catch (err) {
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleLockSeats = async () => {
    if (!userId) {
      setError('User ID is missing. Please logout and login again.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const idempotencyKey = uuidv4();
      const response = await lockSeats(eventId, seats, userId, idempotencyKey);
      
      setLockCreated(true);
      setCurrentLockId(response.lockId);
      
      // Navigate to confirm booking page with lockId
      navigate(`/booking/confirm/${response.lockId}`, {
        state: { eventId, seats, expiresAt: response.expiresAt }
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to lock seats');
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = async () => {
    if (lockCreated && currentLockId) {
      if (window.confirm('You have locked seats. Going back will cancel your lock and restore the seats. Continue?')) {
        try {
          await cancelLock(currentLockId);
          navigate('/');
        } catch (err) {
          console.error('Failed to cancel lock:', err);
          navigate('/');
        }
      }
    } else {
      navigate('/');
    }
  };

  if (loading && !event) {
    return <div className="loading">Loading event details...</div>;
  }

  if (!event) {
    return <div className="error">Event not found</div>;
  }

  return (
    <div className="event-details">
      <button onClick={handleBackClick} className="back-btn">← Back to Events</button>

      <div className="event-details-content">
        <div className="event-header">
          <h2>{event.name}</h2>
          <p className="description">{event.description}</p>
          <div className="event-meta">
            <p>Date: {new Date(event.eventDate).toLocaleString('en-GB')}</p>
            <p>Available Seats: {event.availableSeats} / {event.totalSeats}</p>
          </div>
        </div>

        <div className="booking-section">
          <h3>Book Your Seats</h3>

          {error && <div className="error">{error}</div>}

        <div className="booking-step">
          <label>
            Number of seats:
            <input
              type="number"
              min="1"
              max={event.availableSeats}
              value={seats}
              onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
            />
          </label>
          <button 
            onClick={handleLockSeats} 
            disabled={loading || seats < 1 || seats > event.availableSeats}
          >
            {loading ? 'Processing...' : 'Lock Seats'}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

export default LockSeatsPage;
