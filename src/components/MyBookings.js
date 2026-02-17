// This component shows all bookings made by users
import React, { useState, useEffect } from 'react';
import { getAllBookings, cancelBooking, getUserById } from '../api';
import axios from 'axios';

function MyBookings({ userId }) {
  // State to store list of bookings
  const [bookings, setBookings] = useState([]);
  
  // State for user role
  const [userRole, setUserRole] = useState('user');
  
  // State for my events
  const [myEvents, setMyEvents] = useState([]);
  
  // State for loading and errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Toggle between bookings and events
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' or 'events'

  // Fetch user role on mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await getUserById(userId);
        setUserRole(response.data.role || 'user');
      } catch (err) {
        console.error('Error fetching user role:', err);
      }
    };
    fetchUserRole();
  }, [userId]);

  // Fetch bookings when component loads
  useEffect(() => {
    if (activeTab === 'bookings') {
      fetchBookings();
    } else {
      fetchMyEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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

  // Function to fetch user's created events
  const fetchMyEvents = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Fetching events for userId:', userId);
      const response = await axios.get(`http://localhost:3000/api/events/my-events?userId=${userId}&t=${Date.now()}`);
      console.log('My events response:', response.data);
      setMyEvents(response.data.data || []);
    } catch (err) {
      setError('Failed to load your events');
      console.error('Error fetching events:', err);
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
      <h2>My Dashboard</h2>

      {/* Toggle between bookings and events */}
      <div className="tab-toggle">
        <button 
          className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          My Bookings
        </button>
        {userRole === 'admin' && (
          <button 
            className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            My Events
          </button>
        )}
      </div>

      {/* Refresh button */}
      <button 
        onClick={() => activeTab === 'bookings' ? fetchBookings() : fetchMyEvents()} 
        disabled={loading} 
        className="refresh-btn"
      >
        {loading ? 'Loading...' : activeTab === 'bookings' ? 'Refresh Bookings' : 'Refresh Events'}
      </button>

      {/* Show error or success messages */}
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {/* Show loading message */}
      {loading && <p>Loading...</p>}

      {/* BOOKINGS TAB */}
      {activeTab === 'bookings' && (
        <>
          {/* Show message if no bookings */}
          {!loading && bookings.length === 0 && (
            <p className="info">No bookings found. Book an event to see it here!</p>
          )}

          {/* Display all bookings */}
          <div className="bookings-list">
            {bookings.map((booking) => (
          <div key={booking._id} className="booking-card" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
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
                {booking.amount && (
                  <p><strong>Amount Paid:</strong> ₹{booking.amount}</p>
                )}
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
            
            {booking.event?.image && (
              <div 
                style={{ 
                  width: '200px',
                  height: '280px',
                  backgroundImage: `url(${booking.event.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '8px',
                  flexShrink: 0
                }}
              />
            )}
          </div>
        ))}
      </div>
        </>
      )}

      {/* EVENTS TAB */}
      {activeTab === 'events' && (
        <>
          {/* Show message if no events */}
          {!loading && myEvents.length === 0 && (
            <p className="info">No events created yet. Create an event to see it here!</p>
          )}

          {/* Display all created events */}
          <div className="bookings-list">
            {myEvents.map((event) => (
              <div key={event._id} className="booking-card event-card">
                {event.image && (
                  <div 
                    className="event-image"
                    style={{ 
                      backgroundImage: `url(${event.image})`,
                      height: '200px',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: '8px 8px 0 0',
                      marginBottom: '15px'
                    }}
                  />
                )}
                <div className="booking-header">
                  <h3>{event.name}</h3>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: event.type === 'public' ? '#10b981' : '#f59e0b' }}
                  >
                    {event.type === 'public' ? '🌍 Public' : '🔒 Private'}
                  </span>
                </div>

                <div className="booking-details">
                  <div className="event-description">
                    <strong>Description:</strong>
                    <div className="description-text">{event.description}</div>
                  </div>
                  <p><strong>Event Date:</strong> {new Date(event.eventDate).toLocaleString('en-GB')}</p>
                  <p><strong>Event ID:</strong> <code>{event._id}</code></p>
                  <p><strong>Created:</strong> {new Date(event.createdAt).toLocaleString('en-GB')}</p>
                  <p><strong>Category:</strong> {Array.isArray(event.category) ? event.category.join(', ') : event.category}</p>
                  <p><strong>Platform Fee Paid:</strong> ₹{event.creationCharge || 0}</p>
                  <p><strong>Total Seats:</strong> {event.totalSeats}</p>
                  <p><strong>Available Seats:</strong> {event.availableSeats}</p>
                  <p><strong>Booked Seats:</strong> {event.totalSeats - event.availableSeats}</p>
                  <p><strong>Ticket Price:</strong> ₹{event.amount || 0}</p>
                  <p className="total-collection">
                    <strong>Total Collection:</strong> ₹{(event.totalSeats - event.availableSeats) * (event.amount || 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default MyBookings;
