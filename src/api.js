import { getUser, removeUser } from "./utils/localStorage";
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

// ========== INTERCEPTORS ==========

// Request: attach stored user id/role headers if available
api.interceptors.request.use((config) => {
  const user = getUser();
  if (user) {
    config.headers["x-user-id"] = user._id;
    config.headers["x-user-role"] = user.role;
  }
  return config;
});

// Response: centralized error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;

    // Session expired — clear user and reload to login
    if (status === 401) {
      removeUser();
      window.location.href = "/";
      return Promise.reject(error);
    }

    // Network error — retry GET requests up to 3 times with exponential backoff
    if (!error.response && error.config?.method === "get") {
      error.config._retryCount = (error.config._retryCount || 0) + 1;
      if (error.config._retryCount <= 3) {
        await new Promise((r) =>
          setTimeout(r, 1000 * error.config._retryCount)
        );
        return api(error.config);
      }
    }

    // Attach a user-friendly message for components to use
    const serverMsg = error.response?.data?.message;
    const friendlyMessages = {
      400: serverMsg || "Invalid request. Please check your input.",
      403: "You don't have permission to do that.",
      404: "The requested resource was not found.",
      409: serverMsg || "A conflict occurred. Please try again.",
      500: "Server error. Please try again later.",
    };
    error.friendlyMessage =
      friendlyMessages[status] ||
      serverMsg ||
      (error.message === "Network Error"
        ? "Network error. Check your connection."
        : "Something went wrong. Please try again.");

    return Promise.reject(error);
  }
);

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

// Send OTP to email for password reset
export const forgotPassword = async (email) => {
  const response = await api.post("/users/forgot-password", { email });
  return response.data;
};

// Verify OTP and set new password
export const resetPassword = async ({ email, otp, newPassword }) => {
  const response = await api.post("/users/reset-password", { email, otp, newPassword });
  return response.data;
};
// ========== EVENT APIs ==========

// Create a new event
export const createEvent = async (eventData) => {
  const response = await api.post("/events", eventData);
  return response.data;
};

// Get all public events (or all events for admin) - excludes expired
export const getAllPublicEvents = async (userRole = "user") => {
  const response = await api.get("/events", {
    params: { userRole },
  });
  return response.data;
};

// Get expired events (admin/superAdmin only)
export const getExpiredEvents = async (userRole) => {
  const response = await api.get("/events/expired", {
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
// passType: "regular" (single-day) | "daily" (multi-day, one day) | "season" (multi-day, all days)
// selectedDate: "YYYY-MM-DD" string, required for daily pass only
export const lockSeats = async (eventId, seats, userId, idempotencyKey, passType = "regular", selectedDate = null) => {
  const body = { seats, userId, idempotencyKey, passType };
  if (selectedDate) body.selectedDate = selectedDate;
  const response = await api.post(`/events/${eventId}/lock`, body);
  return response.data; // Returns { success, lock: { _id, expiresAt, ... } }
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
