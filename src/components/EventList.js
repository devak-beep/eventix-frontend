// This component shows a list of all available events
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPublicEvents, getEventById } from '../api';

function EventList() {
  const navigate = useNavigate();
  // State to store list of events
  const [events, setEvents] = useState([]);
  
  // State to show loading message
  const [loading, setLoading] = useState(false);
  
  // State to show error message if something goes wrong
  const [error, setError] = useState('');

  // For searching private events by ID
  const [eventIdInput, setEventIdInput] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Category icons and labels
  const categories = {
    'all': { icon: '🌟', label: 'All Events', image: null },
    'food-drink': { 
      icon: '🍔', 
      label: 'Food & Drink',
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=400&fit=crop'
    },
    'festivals-cultural': { 
      icon: '🎊', 
      label: 'Festivals',
      image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=400&fit=crop'
    },
    'dance-party': { 
      icon: '💃', 
      label: 'Dance & Party',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=400&fit=crop'
    },
    'concerts-music': { 
      icon: '🎵', 
      label: 'Concerts',
      image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=400&fit=crop'
    },
    'sports-live': { 
      icon: '⚽', 
      label: 'Sports & Live',
      image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=400&fit=crop'
    },
    'arts-theater': { 
      icon: '🎭', 
      label: 'Arts & Theater',
      image: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&h=400&fit=crop'
    },
    'comedy-standup': { 
      icon: '😂', 
      label: 'Comedy',
      image: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&h=400&fit=crop'
    },
    'movies-premieres': { 
      icon: '🎬', 
      label: 'Movies',
      image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=400&fit=crop'
    },
  };

  // Fetch public events when component loads
  useEffect(() => {
    fetchPublicEvents();
  }, []);

  // Function to fetch all public events
  const fetchPublicEvents = async () => {
    setLoading(true);
    setError('');

    try {
      // Call API to get all public events
      const response = await getAllPublicEvents();
      setEvents(response.data || []);
    } catch (err) {
      setError('Failed to load events');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch and add an event by ID
  const addEventById = async () => {
    if (!eventIdInput.trim()) {
      setError('Please enter an event ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Call API to get event details
      const response = await getEventById(eventIdInput);
      
      // response = { success: true, data: event }
      const eventData = response.data;
      
      // Check if event already exists in list
      const exists = events.some(e => e._id === eventData._id);
      
      if (!exists) {
        // Add event to the list
        setEvents([...events, eventData]);
        setEventIdInput(''); // Clear input
        setShowSearch(false); // Hide search
        setSelectedCategory('all'); // Show all events
      } else {
        setError('Event already in list');
      }
    } catch (err) {
      setError('Failed to fetch event. Check if ID is correct.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="event-list">
      <div className="list-header">
        <h2>Available Events</h2>
        <div className="search-controls">
          <button 
            onClick={() => setShowSearch(!showSearch)} 
            className="toggle-search-btn"
          >
            {showSearch ? 'Hide Search' : 'Search Private Event'}
          </button>
          
          {/* Search for private events by ID */}
          {showSearch && (
            <div className="search-input-group">
              <input
                type="text"
                placeholder="Enter Private Event ID"
                value={eventIdInput}
                onChange={(e) => setEventIdInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addEventById()}
              />
              <button onClick={addEventById} disabled={loading}>
                {loading ? 'Loading...' : 'Search'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="category-container">
        <button 
          className="scroll-arrow left"
          onClick={() => document.querySelector('.category-tabs').scrollBy({ left: -300, behavior: 'smooth' })}
        >
          ‹
        </button>
        <div className="category-tabs">
          {Object.entries(categories).map(([key, { icon, label }]) => (
          <button
            key={key}
            className={`category-tab ${selectedCategory === key ? 'active' : ''}`}
            onClick={() => setSelectedCategory(key)}
          >
            <span className="category-icon">{icon}</span>
            <span className="category-label">{label}</span>
          </button>
        ))}
        </div>
        <button 
          className="scroll-arrow right"
          onClick={() => document.querySelector('.category-tabs').scrollBy({ left: 300, behavior: 'smooth' })}
        >
          ›
        </button>
      </div>

      {/* Show error message if any */}
      {error && <p className="error">{error}</p>}

      {/* Show loading message */}
      {loading && <p className="info">Loading events...</p>}

      {/* Show message if no events */}
      {!loading && events.filter(e => selectedCategory === 'all' || (Array.isArray(e.category) ? e.category.includes(selectedCategory) : e.category === selectedCategory)).length === 0 && (
        <p className="info">No events available in this category.</p>
      )}

      {/* Display all events as cards */}
      <div className="events-grid">
        {events
          .filter(event => selectedCategory === 'all' || (Array.isArray(event.category) ? event.category.includes(selectedCategory) : event.category === selectedCategory))
          .map((event) => (
          <div 
            key={event._id} 
            className="event-card"
            onClick={() => navigate(`/event/${event._id}`)}
          >
            {/* Event image - use uploaded image if available, otherwise category image */}
            {(event.image || categories[Array.isArray(event.category) ? event.category[0] : event.category]?.image) && (
              <div 
                className="event-image"
                style={{ backgroundImage: `url(${event.image || categories[Array.isArray(event.category) ? event.category[0] : event.category].image})` }}
              >
                {event.type === 'private' && (
                  <span className="event-badge private">🔒 Private</span>
                )}
              </div>
            )}
            
            <div className="event-content">
              <div className="event-category-badge">
                {Array.isArray(event.category) 
                  ? event.category.map(cat => categories[cat]?.icon).join(' ')
                  : categories[event.category]?.icon} {Array.isArray(event.category) 
                  ? event.category.map(cat => categories[cat]?.label).join(', ')
                  : categories[event.category]?.label}
              </div>
              <h3>{event.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EventList;
