// This component shows a list of all available events
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllPublicEvents, getEventById } from "../api";
import { EventListSkeleton } from "./SkeletonLoader";

function EventList() {
  const navigate = useNavigate();
  // State to store list of events
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);

  // State to show loading message
  const [loading, setLoading] = useState(false);

  // State to show error message if something goes wrong
  const [error, setError] = useState("");

  // For searching private events by ID
  const [eventIdInput, setEventIdInput] = useState("");

  // For searching public events by name or organizer
  const [publicEventSearch, setPublicEventSearch] = useState("");

  // Search mode toggle: "public" or "private"
  const [searchMode, setSearchMode] = useState("public");

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Category icons and labels
  const categories = {
    all: { icon: "🌟", label: "All Events", image: null },
    "food-drink": {
      icon: "🍔",
      label: "Food & Drink",
      image:
        "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=400&fit=crop",
    },
    "festivals-cultural": {
      icon: "🎊",
      label: "Festivals",
      image:
        "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=400&fit=crop",
    },
    "dance-party": {
      icon: "💃",
      label: "Dance & Party",
      image:
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=400&fit=crop",
    },
    "concerts-music": {
      icon: "🎵",
      label: "Concerts",
      image:
        "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=400&fit=crop",
    },
    "sports-live": {
      icon: "⚽",
      label: "Sports & Live",
      image:
        "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=400&fit=crop",
    },
    "arts-theater": {
      icon: "🎭",
      label: "Arts & Theater",
      image:
        "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&h=400&fit=crop",
    },
    "comedy-standup": {
      icon: "😂",
      label: "Comedy",
      image:
        "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&h=400&fit=crop",
    },
    "movies-premieres": {
      icon: "🎬",
      label: "Movies",
      image:
        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=400&fit=crop",
    },
  };

  // Fetch public events when component loads
  useEffect(() => {
    fetchPublicEvents();
  }, []);

  // Filter events based on search and category
  useEffect(() => {
    let filtered = events;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((event) =>
        event.category?.includes(selectedCategory),
      );
    }

    // Filter by public event search (name or organizer)
    if (publicEventSearch.trim()) {
      const searchTerm = publicEventSearch.toLowerCase();
      filtered = filtered.filter((event) => {
        const eventName = event.name?.toLowerCase() || "";
        const organizerName = event.createdBy?.name?.toLowerCase() || "";
        const organizerEmail = event.createdBy?.email?.toLowerCase() || "";
        return (
          eventName.includes(searchTerm) ||
          organizerName.includes(searchTerm) ||
          organizerEmail.includes(searchTerm)
        );
      });
    }

    setFilteredEvents(filtered);
  }, [events, selectedCategory, publicEventSearch]);

  // Function to fetch all public events
  const fetchPublicEvents = async () => {
    setLoading(true);
    setError("");

    try {
      // Get user role from localStorage
      const user = JSON.parse(localStorage.getItem("user"));
      const userRole = user?.role || "user";

      // Call API to get events (admin sees all, users see only public)
      const response = await getAllPublicEvents(userRole);
      setEvents(response.data || []);
    } catch (err) {
      setError("Failed to load events");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch and add an event by ID
  const addEventById = async () => {
    if (!eventIdInput.trim()) {
      setError("Please enter an event ID");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Call API to get event details
      const response = await getEventById(eventIdInput);

      // response = { success: true, data: event }
      const eventData = response.data;

      // Check if event already exists in list
      const exists = events.some((e) => e._id === eventData._id);

      if (!exists) {
        // Add event to the list
        setEvents([...events, eventData]);
        setEventIdInput(""); // Clear input
        setSearchMode("public"); // Switch to public search
        setSelectedCategory("all"); // Show all events
      } else {
        setError("Event already in list");
      }
    } catch (err) {
      setError("Failed to fetch event. Check if ID is correct.");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="event-list">
      <div className="list-header">
        <h2>Available Events</h2>
      </div>

      <div className="search-controls">
        {/* Dual-mode search interface - buttons on left */}
        <div className="search-mode-selector">
          <button
            className={`mode-btn ${searchMode === "public" ? "active" : ""}`}
            onClick={() => setSearchMode("public")}
          >
            <span className="mode-icon">🔍</span>
            <span className="mode-text">Search Public</span>
          </button>
          <button
            className={`mode-btn ${searchMode === "private" ? "active" : ""}`}
            onClick={() => setSearchMode("private")}
          >
            <span className="mode-icon">🔐</span>
            <span className="mode-text">Find Private</span>
          </button>
        </div>

        {/* Public event search - center/right */}
        {searchMode === "public" && (
          <div className="search-input-group public-search">
            <input
              type="text"
              placeholder="Search by event name or organizer..."
              value={publicEventSearch}
              onChange={(e) => setPublicEventSearch(e.target.value)}
              className="public-search-input"
            />
          </div>
        )}

        {/* Private event search - center/right */}
        {searchMode === "private" && (
          <div className="search-input-group private-search">
            <input
              type="text"
              placeholder="Paste event ID..."
              value={eventIdInput}
              onChange={(e) => setEventIdInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addEventById()}
              className="private-search-input"
            />
            <button
              onClick={addEventById}
              disabled={loading}
              className="search-btn"
            >
              {loading ? "Loading..." : "Add"}
            </button>
          </div>
        )}
      </div>

      {/* Category filter tabs */}
      <div className="category-container">
        <button
          className="scroll-arrow left"
          onClick={() =>
            document
              .querySelector(".category-tabs")
              .scrollBy({ left: -300, behavior: "smooth" })
          }
        >
          ‹
        </button>
        <div className="category-tabs">
          {Object.entries(categories).map(([key, { icon, label }]) => (
            <button
              key={key}
              className={`category-tab ${selectedCategory === key ? "active" : ""}`}
              onClick={() => setSelectedCategory(key)}
            >
              <span className="category-icon">{icon}</span>
              <span className="category-label">{label}</span>
            </button>
          ))}
        </div>
        <button
          className="scroll-arrow right"
          onClick={() =>
            document
              .querySelector(".category-tabs")
              .scrollBy({ left: 300, behavior: "smooth" })
          }
        >
          ›
        </button>
      </div>

      {/* Show error message if any */}
      {error && <p className="error">{error}</p>}

      {/* Show skeleton loading */}
      {loading && <EventListSkeleton />}

      {/* Show message if no events */}
      {!loading && filteredEvents.length === 0 && (
        <p className="info">
          {publicEventSearch
            ? "No events found matching your search."
            : "No events available in this category."}
        </p>
      )}

      {/* Display filtered events as cards */}
      {!loading && (
        <div className="events-grid">
          {filteredEvents.map((event) => {
            const eventDate = new Date(event.eventDate);
            const now = new Date();
            const isExpired = eventDate <= now;
            const isSoldOut = event.availableSeats === 0;

            // Get user role to show visibility tag only to admin
            const user = JSON.parse(localStorage.getItem("user"));
            const isAdmin =
              user?.role === "admin" || user?.role === "superAdmin";

            return (
              <div
                key={event._id}
                className={`event-card ${isExpired ? "expired" : ""} ${isSoldOut && !isExpired ? "sold-out" : ""}`}
                onClick={() => navigate(`/event/${event._id}`)}
              >
                {/* Event image - use uploaded image if available, otherwise category image */}
                {(event.image ||
                  categories[
                    Array.isArray(event.category)
                      ? event.category[0]
                      : event.category
                  ]?.image) && (
                  <div
                    className="event-image"
                    style={{
                      backgroundImage: `url(${event.image || categories[Array.isArray(event.category) ? event.category[0] : event.category].image})`,
                    }}
                  >
                    {/* Status badges at top-right */}
                    {isExpired && (
                      <span className="event-badge expired">⏰ Expired</span>
                    )}
                    {!isExpired && isSoldOut && (
                      <span className="event-badge sold-out">🎫 Sold Out</span>
                    )}
                    {/* Visibility badge for admin only - at top-right */}
                    {isAdmin && !isExpired && !isSoldOut && (
                      <span className={`event-badge visibility ${event.type}`}>
                        {event.type === "public" ? "🌍 Public" : "🔒 Private"}
                      </span>
                    )}
                  </div>
                )}

                <div className="event-content">
                  <div className="event-category-badge">
                    {Array.isArray(event.category)
                      ? event.category
                          .map((cat) => categories[cat]?.icon)
                          .join(" ")
                      : categories[event.category]?.icon}{" "}
                    {Array.isArray(event.category)
                      ? event.category
                          .map((cat) => categories[cat]?.label)
                          .join(", ")
                      : categories[event.category]?.label}
                  </div>
                  <h3>{event.name}</h3>
                  {event.createdBy && (
                    <p className="event-organizer">
                      👤 by {event.createdBy.name}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EventList;
