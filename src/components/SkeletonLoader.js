import React from "react";
import "./SkeletonLoader.css";

export function EventCardSkeleton() {
  return (
    <div className="event-card skeleton-card">
      <div className="skeleton skeleton-image"></div>
      <div className="event-content">
        <div className="skeleton skeleton-badge"></div>
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text short"></div>
      </div>
    </div>
  );
}

export function EventListSkeleton() {
  return (
    <div className="events-grid">
      {[...Array(6)].map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function EventDetailsSkeleton() {
  return (
    <div className="event-details">
      <div className="skeleton skeleton-back-btn"></div>
      <div className="event-header">
        <div className="skeleton skeleton-heading"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text short"></div>
      </div>
      <div className="booking-section">
        <div className="skeleton skeleton-subheading"></div>
        <div className="skeleton skeleton-input"></div>
        <div className="skeleton skeleton-button"></div>
      </div>
    </div>
  );
}

export function LockSeatsPageSkeleton() {
  return (
    <div className="event-details">
      <div className="skeleton skeleton-back-btn"></div>
      <div className="event-header">
        <div className="skeleton skeleton-heading"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text"></div>
      </div>
      <div className="booking-section">
        <div className="skeleton skeleton-subheading"></div>
        <div className="skeleton skeleton-input"></div>
        <div className="skeleton skeleton-text short"></div>
        <div className="skeleton skeleton-button"></div>
      </div>
    </div>
  );
}

export function ConfirmBookingSkeleton() {
  return (
    <div className="event-details">
      <div className="skeleton skeleton-back-btn"></div>
      <div className="booking-section">
        <div className="skeleton skeleton-subheading"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text short"></div>
        <div style={{ marginTop: "20px" }}>
          <div className="skeleton skeleton-button"></div>
        </div>
      </div>
    </div>
  );
}

export function PaymentPageSkeleton() {
  return (
    <div className="event-details">
      <div className="booking-section">
        <div className="skeleton skeleton-heading"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text"></div>
        <div style={{ marginTop: "20px" }}>
          <div className="skeleton skeleton-button"></div>
        </div>
      </div>
    </div>
  );
}

export function BookingResultSkeleton() {
  return (
    <div className="event-details">
      <div className="booking-section">
        <div className="skeleton skeleton-heading"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text"></div>
        <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
          <div className="skeleton skeleton-button" style={{ flex: 1 }}></div>
          <div className="skeleton skeleton-button" style={{ flex: 1 }}></div>
        </div>
      </div>
    </div>
  );
}

export function MyBookingsSkeleton() {
  return (
    <div className="my-bookings">
      <div className="skeleton skeleton-heading"></div>
      <div
        className="skeleton skeleton-text"
        style={{ marginBottom: "20px" }}
      ></div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <div
          className="skeleton skeleton-button"
          style={{ flex: 1, height: "40px" }}
        ></div>
        <div
          className="skeleton skeleton-button"
          style={{ flex: 1, height: "40px" }}
        ></div>
      </div>
      <div className="bookings-list">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton-booking-card">
            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-text"></div>
            <div
              className="skeleton skeleton-button"
              style={{ marginTop: "10px" }}
            ></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CreateEventSkeleton() {
  return (
    <div className="create-event">
      <div className="skeleton skeleton-heading"></div>
      <div
        className="skeleton skeleton-text"
        style={{ marginBottom: "20px" }}
      ></div>
      <form>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="form-group">
            <div
              className="skeleton skeleton-text"
              style={{ marginBottom: "8px", width: "100px" }}
            ></div>
            <div className="skeleton skeleton-input"></div>
          </div>
        ))}
        <div
          className="skeleton skeleton-button"
          style={{ marginTop: "20px" }}
        ></div>
      </form>
    </div>
  );
}
