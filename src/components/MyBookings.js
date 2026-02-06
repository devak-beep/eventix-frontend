// This component shows all bookings made by users
import React, { useState, useEffect } from 'react';
import { getAllBookings, cancelBooking } from '../api';

function MyBookings({ userId }) {
  // State to store list of bookings
  const [bookings, setBookings] = useState([]);
  
  // State for loading and errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch bookings when component loads
  useEffect(() => {
    fetchBookings();
  }, []);

  // Function to get all bookings from backend
  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await getAllBookings();
      console.log('=== BOOKINGS DEBUG ===');
      console.log('Full response:', response);
      console.log('Current userId:', userId);
      console.log('All bookings:', response.data);
      
      // Filter bookings to show only current user's bookings
      const userBookings = (response.data || []).filter(booking => {
        console.log('Checking booking:', booking._id);
        console.log('Booking user:', booking.user);
        
        // Skip bookings with null user
        if (!booking.user) {
          console.log('Skipping - null user');
          return false;
        }
        
        // Check if user is an object (populated) or string (ID)
        const bookingUserId = typeof booking.user === 'object' ? booking.user._id : booking.user;
        console.log('Booking userId:', bookingUserId, 'Current userId:', userId, 'Match:', bookingUserId === userId);
        return bookingUserId === userId;
      });
      console.log('Filtered bookings count:', userBookings.length);
      console.log('Filtered bookings:', userBookings);
      setBookings(userBookings);
    } catch (err) {
      setError('Failed to load bookings');
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to cancel a booking
  const handleCancelBooking = async (bookingId) => {
    // Ask user to confirm cancellation
    if (!window.confirm('Are you sure you want to cancel this booking? You will get 50% refund.')) {
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await cancelBooking(bookingId);
      setSuccess('Booking cancelled successfully! 50% refund processed.');
      
      // Refresh bookings list
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  // Function to get color based on booking status
  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return 'green';
      case 'PAYMENT_PENDING':
        return 'orange';
      case 'CANCELLED':
        return 'red';
      case 'PAYMENT_FAILED':
        return 'darkred';
      default:
        return 'gray';
    }
  };

  return (
    <div className="my-bookings">
      <h2>My Bookings</h2>

      {/* Refresh button */}
      <button onClick={fetchBookings} disabled={loading} className="refresh-btn">
        {loading ? 'Loading...' : 'Refresh Bookings'}
      </button>

      {/* Show error or success messages */}
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {/* Show loading message */}
      {loading && <p>Loading bookings...</p>}

      {/* Show message if no bookings */}
      {!loading && bookings.length === 0 && (
        <p className="info">No bookings found. Book an event to see it here!</p>
      )}

      {/* Display all bookings */}
      <div className="bookings-list">
        {bookings.map((booking) => (
          <div key={booking._id} className="booking-card">
            <div className="booking-header">
              <h3>Booking #{booking._id.slice(-6)}</h3>
              <span 
                className="status-badge"
                style={{ backgroundColor: getStatusColor(booking.status) }}
              >
                {booking.status}
              </span>
            </div>

            <div className="booking-details">
              <p><strong>Event:</strong> {booking.event?.name || booking.event || 'N/A'}</p>
              <p><strong>User:</strong> {booking.user?.name || booking.user || 'N/A'}</p>
              <p><strong>Seats:</strong> {Array.isArray(booking.seats) ? booking.seats.length : booking.seats}</p>
              <p><strong>Created:</strong> {new Date(booking.createdAt).toLocaleString('en-GB')}</p>
              
              {/* Show payment expiry if pending */}
              {booking.paymentExpiresAt && (
                <p><strong>Payment Expires:</strong> {new Date(booking.paymentExpiresAt).toLocaleString('en-GB')}</p>
              )}
            </div>

            {/* Show cancel button only for confirmed bookings */}
            {booking.status === 'CONFIRMED' && (
              <button 
                onClick={() => handleCancelBooking(booking._id)}
                disabled={loading}
                className="cancel-btn"
              >
                Cancel Booking (50% refund)
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyBookings;
