// This component allows creating new events
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent } from '../api';
import { v4 as uuidv4 } from 'uuid';

function CreateEvent({ userId }) {
  const navigate = useNavigate();
  
  // Debug: Log userId
  console.log('CreateEvent userId:', userId);
  
  // State for event form
  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    eventDate: '',
    totalSeats: 10,
    type: 'public', // Default to public
    category: 'concerts-music', // Default category
    amount: 0, // Price per ticket in rupees
    currency: 'INR',
  });

  // State for UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdEventId, setCreatedEventId] = useState('');
  const [creationCharge, setCreationCharge] = useState(500);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Calculate creation charge based on total seats
  const calculateCreationCharge = (seats) => {
    if (seats <= 50) return 500;
    if (seats <= 100) return 1000;
    if (seats <= 200) return 1500;
    if (seats <= 500) return 2500;
    return 5000;
  };

  // Handle input changes for event form
  const handleEventChange = (e) => {
    const { name, value } = e.target;
    setEventData({
      ...eventData,
      [name]: value,
    });
    
    // Update creation charge when totalSeats changes
    if (name === 'totalSeats') {
      setCreationCharge(calculateCreationCharge(parseInt(value) || 0));
    }
  };

  // Submit event creation
  const handleCreateEvent = async (e) => {
    e.preventDefault(); // Prevent page reload
    
    setError('');
    setSuccess('');

    // Validate description length
    if (eventData.description.trim().length < 10) {
      setError('Description must be at least 10 characters long');
      return;
    }

    if (eventData.description.trim().length > 1500) {
      setError('Description must not exceed 1500 characters');
      return;
    }

    // Validate event date is not in the past
    const selectedDate = new Date(eventData.eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day

    if (selectedDate < today) {
      setError('Event date cannot be in the past. Please select a future date.');
      return;
    }

    // Show payment confirmation
    const charge = calculateCreationCharge(parseInt(eventData.totalSeats) || 0);
    setCreationCharge(charge);
    setShowPaymentConfirm(true);
  };

  // Handle payment confirmation
  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      // Generate idempotency key for this event creation
      const idempotencyKey = uuidv4();
      
      console.log('Creating event with userId:', userId);
      console.log('Event data:', { ...eventData, userId, idempotencyKey });
      
      // Call API to create event with userId and idempotency key
      const response = await createEvent({ 
        ...eventData, 
        userId,
        idempotencyKey 
      });
      
      console.log('Event created:', response);
      
      setCreatedEventId(response.data._id);
      setCreationCharge(response.creationCharge || 0);
      setPaymentSuccess(true);
      setShowPaymentConfirm(false);
      
      // Reset form
      setEventData({
        name: '',
        description: '',
        eventDate: '',
        totalSeats: 10,
        type: 'public',
        category: 'concerts-music',
        amount: 0,
        currency: 'INR',
      });
      setCreationCharge(calculateCreationCharge(10));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-event">
      <button onClick={() => navigate('/')} className="back-btn">← Back to Events</button>

      <h2>Create New Event</h2>

      {/* Payment Confirmation Modal */}
      {showPaymentConfirm && (
        <div className="payment-modal">
          <div className="payment-modal-content">
            <h3>💳 Confirm Payment</h3>
            <p>Platform fee for creating this event:</p>
            <div className="payment-amount">₹{creationCharge}</div>
            <p className="payment-info">
              This fee covers hosting and managing your event on our platform.
            </p>
            <div className="payment-buttons">
              <button 
                onClick={handlePayment} 
                disabled={loading}
                className="success-btn"
              >
                {loading ? 'Processing...' : '✓ Pay & Create Event'}
              </button>
              <button 
                onClick={() => setShowPaymentConfirm(false)}
                className="cancel-btn"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
            {error && <div className="error" style={{marginTop: '20px'}}>{error}</div>}
          </div>
        </div>
      )}

      {/* Success Message after payment */}
      {paymentSuccess && (
        <div className="created-event-info">
          <h3>🎉 Congratulations!</h3>
          <p>Your event has been created successfully!</p>
          <p>Platform fee paid: ₹{creationCharge}</p>
          <p>Copy this Event ID to share with others:</p>
          <div className="copy-section">
            <code>{createdEventId}</code>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(createdEventId);
                alert('Event ID copied to clipboard!');
              }}
            >
              📋 Copy
            </button>
          </div>
        </div>
      )}

      {/* Show error messages */}
      {error && !showPaymentConfirm && <div className="error">{error}</div>}

      {/* Event creation form */}
      {!paymentSuccess && (
        <form onSubmit={handleCreateEvent} className="event-form">
        <div className="form-group">
          <label>Event Name:</label>
          <input
            type="text"
            name="name"
            value={eventData.name}
            onChange={handleEventChange}
            required
            placeholder="e.g., Rock Concert 2024"
          />
        </div>

        <div className="form-group">
          <label>Description:</label>
          <textarea
            name="description"
            value={eventData.description}
            onChange={handleEventChange}
            required
            placeholder="Describe your event..."
            rows="4"
            maxLength="1500"
          />
          <small>{eventData.description.length}/1500 characters</small>
        </div>

        <div className="form-group">
          <label>Event Date & Time:</label>
          <input
            type="datetime-local"
            name="eventDate"
            value={eventData.eventDate}
            onChange={handleEventChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Event Category:</label>
          <select
            name="category"
            value={eventData.category}
            onChange={handleEventChange}
            required
          >
            <option value="food-drink">🍔 Food & Drink</option>
            <option value="sports-live">⚽ Sports & Live Matches</option>
            <option value="arts-theater">🎭 Arts & Theater</option>
            <option value="comedy-standup">😂 Comedy & Stand-up</option>
            <option value="movies-premieres">🎬 Movies & Premieres</option>
            <option value="concerts-music">🎵 Concerts & Music Fest</option>
          </select>
        </div>

        <div className="form-group">
          <label>Total Seats:</label>
          <input
            type="number"
            name="totalSeats"
            value={eventData.totalSeats}
            onChange={handleEventChange}
            required
            min="1"
          />
          {eventData.totalSeats > 0 && (
            <small className="creation-charge-info">
              Platform fee: ₹{calculateCreationCharge(parseInt(eventData.totalSeats) || 0)}
            </small>
          )}
        </div>

        <div className="form-group">
          <label>Ticket Price (₹):</label>
          <input
            type="number"
            name="amount"
            value={eventData.amount}
            onChange={handleEventChange}
            required
            min="0"
            step="0.01"
            placeholder="e.g., 500"
          />
          <small>Price per ticket in Indian Rupees (INR)</small>
        </div>

        <div className="form-group">
          <label>Event Type:</label>
          <select
            name="type"
            value={eventData.type}
            onChange={handleEventChange}
            required
          >
            <option value="public">🌍 Public (Visible to everyone)</option>
            <option value="private">🔒 Private (Only accessible by ID)</option>
          </select>
          <small>
            Public events appear on home page. Private events can only be found by searching their ID.
          </small>
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Processing...' : '✨ Continue to Payment'}
        </button>
      </form>
      )}
    </div>
  );
}

export default CreateEvent;
