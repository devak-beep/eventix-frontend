import React from "react";

export default function EventsTab({
  myEvents, loading, userId, userRole,
  uploadingImageFor, triggerImageUpload, fileInputRef, handleFileSelect,
  editEventId, setEditEventId,
  editName, setEditName,
  editDescription, setEditDescription,
  editCategory, setEditCategory,
  editTotalSeats, setEditTotalSeats,
  editAvailableSeats, setEditAvailableSeats,
  savingEdit, handleSaveEdit, handleEditCategoryChange,
  eventBookings, expandedEventId, loadingBookingsFor, fetchEventBookings,
  openDeleteModal,
}) {
  return (
    <>
      <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleFileSelect} />
      {!loading && myEvents.length === 0 && (
        <p className="info">No events created yet. Create an event to see it here!</p>
      )}
      <div className="bookings-list">
        {myEvents.map((event) => {
          const isCreator = event.createdBy && (event.createdBy?._id === userId || event.createdBy === userId);
          const isApprover = event.approvedBy && (event.approvedBy?._id === userId || event.approvedBy === userId);
          const isSuperAdmin = userRole === "superAdmin";
          const isAdmin = userRole === "admin";
          let canUpdateImage = false;
          if (isSuperAdmin) canUpdateImage = true;
          else if (isAdmin && (isCreator || isApprover)) canUpdateImage = true;
          else if (userRole === "user" && isCreator) canUpdateImage = true;

          return (
            <div key={event._id} className="booking-card event-card">
              <div className="event-image-container" style={{ position: "relative" }}>
                {event.image ? (
                  <div className="event-image" style={{ backgroundImage: `url(${event.image})`, height: "200px", backgroundSize: "cover", backgroundPosition: "center", borderRadius: "8px 8px 0 0", marginBottom: "15px" }} />
                ) : (
                  <div className="event-image-placeholder" style={{ height: "200px", backgroundColor: "var(--background-tertiary)", borderRadius: "8px 8px 0 0", marginBottom: "15px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>No Image</div>
                )}
                {canUpdateImage && (
                  <button onClick={() => triggerImageUpload(event._id)} disabled={uploadingImageFor === event._id} className="change-image-btn" style={{ position: "absolute", top: "10px", left: "10px", padding: "8px 12px", backgroundColor: "rgba(0,0,0,0.7)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s ease", width: "auto" }}
                    onMouseEnter={(e) => { e.target.style.backgroundColor = "rgba(37,99,235,0.9)"; }}
                    onMouseLeave={(e) => { e.target.style.backgroundColor = "rgba(0,0,0,0.7)"; }}>
                    {uploadingImageFor === event._id ? (<><span className="spinner-small"></span>Uploading...</>) : (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>{event.image ? "Change Image" : "Add Image"}</>)}
                  </button>
                )}
              </div>

              <div className="booking-header" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {editEventId === event._id ? (
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} style={{ fontSize: "1.2em", fontWeight: 600, flex: 1 }} autoFocus />
                ) : (
                  <h3 style={{ flex: 1 }}>{event.name}</h3>
                )}
                {canUpdateImage && editEventId !== event._id && (
                  <button onClick={() => { setEditEventId(event._id); setEditName(event.name); setEditDescription(event.description); setEditCategory(Array.isArray(event.category) ? event.category : event.category ? [event.category] : []); setEditTotalSeats(event.totalSeats || ""); setEditAvailableSeats(event.availableSeats || ""); }} title="Edit event details" style={{ background: "#3b82f6", border: "none", cursor: "pointer", padding: "6px", marginLeft: "8px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                  </button>
                )}
                {editEventId === event._id && (
                  <>
                    <button onClick={() => handleSaveEdit(event)} disabled={savingEdit} style={{ background: "#10b981", color: "white", border: "none", borderRadius: "4px", padding: "6px 14px", marginLeft: "6px", fontWeight: 600, cursor: savingEdit ? "not-allowed" : "pointer" }}>{savingEdit ? "Saving..." : "Save"}</button>
                    <button onClick={() => setEditEventId(null)} disabled={savingEdit} style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "4px", padding: "6px 14px", marginLeft: "6px", fontWeight: 600, cursor: savingEdit ? "not-allowed" : "pointer" }}>Cancel</button>
                  </>
                )}
                <span className="status-badge" style={{ backgroundColor: event.type === "public" ? "#10b981" : "#f59e0b" }}>{event.type === "public" ? "🌍 Public" : "🔒 Private"}</span>
              </div>

              <div className="booking-details">
                <div className="event-description">
                  <strong>Description:</strong>
                  {editEventId === event._id ? (
                    <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} maxLength={1500} rows={3} style={{ width: "100%", fontSize: "1em", marginTop: "4px" }} />
                  ) : (
                    <div className="description-text">{event.description}</div>
                  )}
                </div>
                <p><strong>Event Date:</strong> {new Date(event.eventDate).toLocaleString("en-GB")}</p>
                <p><strong>Event ID:</strong> <code>{event._id}</code></p>
                {(userRole === "admin" || userRole === "superAdmin") && (
                  <>
                    {event.createdBy && <p><strong>Created By:</strong> {event.createdBy.name} (<code>{event.createdBy?._id}</code>)</p>}
                    {event.approvedBy && <p><strong>Approved By:</strong> {event.approvedBy.name} (<code>{event.approvedBy?._id}</code>)</p>}
                  </>
                )}
                <p><strong>Created:</strong> {new Date(event.createdAt).toLocaleString("en-GB")}</p>
                <div style={{ marginBottom: "12px" }}>
                  <strong style={{ display: "block", marginBottom: "8px" }}>Category:</strong>
                  {editEventId === event._id ? (
                    <div>
                      <div className="category-checkboxes">
                        {["food-drink", "festivals-cultural", "dance-party"].map((cat) => (
                          <label key={cat} className="checkbox-label">
                            <input type="checkbox" checked={editCategory.includes(cat)} onChange={() => handleEditCategoryChange(cat)} />
                            <span className="checkbox-text">{cat === "food-drink" ? "🍔 Food & Drink" : cat === "festivals-cultural" ? "🎊 Festivals & Cultural" : "💃 Dance & Party"}</span>
                          </label>
                        ))}
                      </div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)" }}>Or select single category:</label>
                      <select value={editCategory.find((c) => !["food-drink", "festivals-cultural", "dance-party"].includes(c)) || ""} onChange={(e) => e.target.value && handleEditCategoryChange(e.target.value)} style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "14px" }}>
                        <option value="">-- Select Category --</option>
                        <option value="music-live">🎵 Concerts</option>
                        <option value="sports-live">⚽ Sports & Live</option>
                        <option value="arts-theater">🎭 Arts & Theater</option>
                        <option value="comedy-show">😂 Comedy</option>
                        <option value="movies">🎬 Movies</option>
                      </select>
                    </div>
                  ) : (
                    <span>{Array.isArray(event.category) ? event.category.join(", ") : event.category}</span>
                  )}
                </div>
                <p><strong>Platform Fee Paid:</strong> ₹{event.creationCharge || 0}</p>
                <p><strong>Total Seats:</strong>{" "}{editEventId === event._id && userRole === "superAdmin" ? (<input type="number" value={editTotalSeats} onChange={(e) => setEditTotalSeats(e.target.value)} min="1" style={{ width: "120px", padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "14px", marginLeft: "8px" }} />) : event.totalSeats}</p>
                <p><strong>Available Seats:</strong>{" "}{editEventId === event._id && userRole === "superAdmin" ? (<input type="number" value={editAvailableSeats} onChange={(e) => setEditAvailableSeats(e.target.value)} min="0" max={editTotalSeats} style={{ width: "120px", padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "14px", marginLeft: "8px" }} />) : event.availableSeats}</p>
                <p><strong>Booked Seats:</strong> {event.totalSeats - event.availableSeats}{eventBookings[event._id] && eventBookings[event._id].length !== event.totalSeats - event.availableSeats && (<span style={{ color: "#ef4444", fontSize: "12px", marginLeft: "8px" }}>⚠️ (Actual confirmed: {eventBookings[event._id].length})</span>)}</p>
                <p><strong>Ticket Price:</strong>{" "}{event.eventType === "multi-day" ? (<span style={{ display: "inline-flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}><span>🎟️ Day Pass: {(event.passOptions?.dailyPass?.price ?? 0) > 0 ? `₹${event.passOptions.dailyPass.price}` : "Free"}</span><span style={{ opacity: 0.4 }}>|</span><span>🌟 Season Pass: {(event.passOptions?.seasonPass?.price ?? 0) > 0 ? `₹${event.passOptions.seasonPass.price}` : "Free"}</span></span>) : (event.amount || 0) > 0 ? `₹${event.amount}` : "Free"}</p>
                <p className="total-collection"><strong>Total Collection:</strong> ₹{event.eventType === "multi-day" ? "N/A (varies by pass type)" : (event.totalSeats - event.availableSeats) * (event.amount || 0)}</p>
                {event.createdViaRequest && (
                  <div style={{ marginTop: "12px", padding: "10px", background: "var(--bg-secondary)", borderRadius: "8px", borderLeft: "3px solid var(--primary-color)" }}>
                    <p style={{ margin: "0 0 4px 0", fontSize: "13px" }}><strong>📝 Created via Request</strong></p>
                    {event.approvedBy && <p style={{ margin: "0", fontSize: "13px", color: "var(--text-secondary)" }}>Approved by: <strong>{event.approvedBy.name}</strong></p>}
                  </div>
                )}
                <button onClick={() => fetchEventBookings(event._id)} disabled={loadingBookingsFor === event._id} style={{ marginTop: "12px", padding: "10px 20px", background: expandedEventId === event._id ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "linear-gradient(135deg, #3b82f6, #2563eb)", color: "white", border: "none", borderRadius: "8px", cursor: loadingBookingsFor === event._id ? "wait" : "pointer", fontSize: "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "center" }}>
                  {loadingBookingsFor === event._id ? "Loading..." : expandedEventId === event._id ? (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6" /></svg>Hide Bookings</>) : (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>View Bookings{eventBookings[event._id] ? ` (${eventBookings[event._id].length})` : ` (${event.totalSeats - event.availableSeats})`}</>)}
                </button>
                {expandedEventId === event._id && eventBookings[event._id] && (
                  <div style={{ marginTop: "16px", padding: "16px", background: "var(--background-secondary)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                    <h4 style={{ margin: "0 0 12px 0", color: "var(--text-primary)" }}>📋 Confirmed Bookings ({eventBookings[event._id].length})</h4>
                    {eventBookings[event._id].length === 0 ? (
                      <p style={{ color: "var(--text-secondary)", margin: 0 }}>No confirmed bookings yet.</p>
                    ) : (
                      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                          <thead>
                            <tr style={{ background: "var(--background-tertiary)", textAlign: "left" }}>
                              {["User", "Email", "Seats", "Amount", "Booked On"].map((h) => (
                                <th key={h} style={{ padding: "10px", borderBottom: "1px solid var(--border-color)" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {eventBookings[event._id].map((booking) => (
                              <tr key={booking._id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                <td style={{ padding: "10px" }}>{booking.user?.name || "Unknown"}</td>
                                <td style={{ padding: "10px", color: "var(--text-secondary)" }}>{booking.user?.email || "N/A"}</td>
                                <td style={{ padding: "10px", fontWeight: "600" }}>{Array.isArray(booking.seats) ? booking.seats.length : booking.seats}</td>
                                <td style={{ padding: "10px", color: "#10b981" }}>₹{booking.amount || 0}</td>
                                <td style={{ padding: "10px", color: "var(--text-secondary)", fontSize: "12px" }}>{new Date(booking.createdAt).toLocaleString("en-GB")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                {canUpdateImage && (
                  <button onClick={() => openDeleteModal(event)} className="delete-event-btn" style={{ marginTop: "16px", padding: "10px 20px", background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "center", transition: "all 0.2s ease" }}
                    onMouseEnter={(e) => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 4px 12px rgba(239,68,68,0.4)"; }}
                    onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "none"; }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                    Delete Event
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
