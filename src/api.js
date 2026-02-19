// This file handles all communication with the backend server
import axios from "axios";

// Base URL where your backend is running
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";

// Create axios instance with default settings
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ========== USER APIs ==========

// Create a new user (registration)
export const createUser = async (userData) => {
  const response = await api.post("/users/register", userData);
  return response.data;
};

// Login user
export const loginUser = async (credentials) => {
  const response = await api.post("/users/login", credentials);
  return response.data;
};

// Get user by ID
export const getUserById = async (userId) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

// Verify OTP after registration
export const verifyRegisterOtp = async ({ email, otp }) => {
  const response = await api.post("/users/verify-register-otp", { email, otp });
  return response.data;
};

// Verify OTP after login
export const verifyLoginOtp = async ({ email, otp }) => {
  const response = await api.post("/users/verify-login-otp", { email, otp });
  return response.data;
};

// Resend OTP (for both register and login)
export const resendOtp = async ({ email, purpose }) => {
  const response = await api.post("/users/resend-otp", { email, purpose });
  return response.data;
};
// Update OTP preference for login (enable/disable)
export const updateOtpPreference = async (userId, otpEnabled) => {
  const response = await api.put(`/users/${userId}/otp-preference`, {
    otpEnabled,
  });
  return response.data;
};
// ========== EVENT APIs ==========

// Create a new event
export const createEvent = async (eventData) => {
  const response = await api.post("/events", eventData);
  return response.data;
};

// Get all public events (or all events for admin)
export const getAllPublicEvents = async (userRole = "user") => {
  const response = await api.get("/events", {
    params: { userRole },
  });
  return response.data;
};

// Get event details by ID
export const getEventById = async (eventId) => {
  const response = await api.get(`/events/${eventId}`);
  return response.data;
};

// ========== BOOKING APIs ==========

// Step 1: Lock seats (reserve them temporarily)
export const lockSeats = async (eventId, seats, userId, idempotencyKey) => {
  const response = await api.post(`/events/${eventId}/lock`, {
    seats,
    userId,
    idempotencyKey,
  });
  return response.data; // Returns { success, lockId, expiresAt }
};

// Cancel a seat lock
export const cancelLock = async (lockId) => {
  const response = await api.post(`/locks/${lockId}/cancel`);
  return response.data;
};

// Step 2: Confirm booking (after locking seats)
export const confirmBooking = async (lockId) => {
  const response = await api.post("/bookings/confirm", { lockId });
  return response.data;
};

// Get all bookings
export const getAllBookings = async () => {
  const response = await api.get("/bookings");
  return response.data;
};

// Get specific booking by ID
export const getBookingById = async (bookingId) => {
  const response = await api.get(`/bookings/${bookingId}`);
  return response.data;
};

// ========== PAYMENT APIs ==========

// Process payment for a booking
export const processPayment = async (bookingId, paymentData) => {
  const response = await api.post(
    `/payments/${bookingId}/process`,
    paymentData,
  );
  return response.data;
};

// ========== CANCELLATION APIs ==========

// Cancel a booking
export const cancelBooking = async (bookingId) => {
  const response = await api.post(`/cancellations/${bookingId}/cancel`);
  return response.data;
};

export default api;
