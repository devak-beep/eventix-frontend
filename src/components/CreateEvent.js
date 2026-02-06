// This component allows creating new events
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent } from '../api';

function CreateEvent() {
  const navigate = useNavigate();
  // State for event form
  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    eventDate: '',
    totalSeats: 10,
    type: 'public', // Default to public
    category: 'concerts-music', // Default category
  });

  // State for UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdEventId, setCreatedEventId] = useState('');

  // Handle input changes for event form
  const handleEventChange = (e) => {
    setEventData({
      ...eventData,
      [e.target.name]: e.target.value,
    });
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

    setLoading(true);

    try {
      // Call API to create event
      const response = await createEvent(eventData);
      
      setCreatedEventId(response.data._id);
      setSuccess(`✅ Event created successfully! Event ID: ${response.data._id}`);
      
      // Reset form
      setEventData({
        name: '',
        description: '',
        eventDate: '',
        totalSeats: 10,
        type: 'public',
        category: 'concerts-music',
      });
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

      {/* Show error or success messages */}
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {/* Event creation form */}
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
          {loading ? 'Creating...' : '✨ Create Event'}
        </button>
      </form>

      {/* Copy Event ID button */}
      {createdEventId && (
        <div className="created-event-info">
          <p>Copy this Event ID to add it to the events list:</p>
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
    </div>
  );
}

export default CreateEvent;
