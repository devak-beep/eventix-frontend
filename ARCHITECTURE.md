# 🏗️ System Architecture

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         BROWSER                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    React Frontend                      │  │
│  │                   (Port 3001)                          │  │
│  │                                                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │ Event    │  │ Event    │  │ My       │           │  │
│  │  │ List     │  │ Details  │  │ Bookings │           │  │
│  │  └──────────┘  └──────────┘  └──────────┘           │  │
│  │                                                        │  │
│  │                    ↕ (HTTP)                           │  │
│  │                                                        │  │
│  │                  ┌──────────┐                         │  │
│  │                  │  api.js  │                         │  │
│  │                  └──────────┘                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
                         (HTTP Requests)
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    Express Backend                           │
│                      (Port 3000)                             │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Event    │  │ Booking  │  │ Payment  │  │ Cancel   │   │
│  │ Routes   │  │ Routes   │  │ Routes   │  │ Routes   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│       ↓              ↓              ↓              ↓        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Event    │  │ Booking  │  │ Payment  │  │ Cancel   │   │
│  │Controller│  │Controller│  │Controller│  │Controller│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│                           ↕                                  │
│                                                              │
│                    ┌──────────┐                             │
│                    │ MongoDB  │                             │
│                    │ Database │                             │
│                    └──────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App.js (Main Container)
│
├── Navigation Bar
│   ├── All Events Button
│   ├── Create Event Button
│   └── My Bookings Button
│
└── Content Area (switches based on button clicked)
    │
    ├── EventList.js
    │   ├── Add Event Input
    │   └── Event Cards Grid
    │       └── Event Card (click → EventDetails)
    │
    ├── EventDetails.js
    │   ├── Event Info
    │   └── Booking Section
    │       ├── Step 1: Lock Seats
    │       ├── Step 2: Confirm Booking
    │       └── Step 3: Process Payment
    │
    ├── MyBookings.js
    │   ├── Refresh Button
    │   └── Bookings List
    │       └── Booking Card
    │           └── Cancel Button
    │
    └── CreateEvent.js
        ├── Event Form
        └── User Form (optional)
```

## Data Flow: Booking an Event

```
┌─────────────────────────────────────────────────────────────┐
│                    STEP 1: LOCK SEATS                        │
└─────────────────────────────────────────────────────────────┘

User clicks "Lock Seats"
         ↓
EventDetails.handleLockSeats()
         ↓
api.lockSeats(eventId, seats, key)
         ↓
POST /api/events/:eventId/lock
         ↓
Backend: event.controller.lockSeats()
         ↓
Backend: Creates SeatLock in database
Backend: Reduces event.availableSeats
         ↓
Returns: { lockId, expiresAt }
         ↓
Frontend: Saves lockId
Frontend: Shows "Seats locked!" message

┌─────────────────────────────────────────────────────────────┐
│                 STEP 2: CONFIRM BOOKING                      │
└─────────────────────────────────────────────────────────────┘

User clicks "Confirm Booking"
         ↓
EventDetails.handleConfirmBooking()
         ↓
api.confirmBooking(lockId)
         ↓
POST /api/bookings/confirm
         ↓
Backend: bookingConfirmation.controller.confirmBooking()
         ↓
Backend: Creates Booking with PAYMENT_PENDING status
Backend: Deletes SeatLock
         ↓
Returns: { booking }
         ↓
Frontend: Saves bookingId
Frontend: Shows "Booking confirmed!" message

┌─────────────────────────────────────────────────────────────┐
│                  STEP 3: PROCESS PAYMENT                     │
└─────────────────────────────────────────────────────────────┘

User clicks "Pay Now"
         ↓
EventDetails.handlePayment(status)
         ↓
api.processPayment(bookingId, { status, key })
         ↓
POST /api/payments/:bookingId/process
         ↓
Backend: payment.controller.processPayment()
         ↓
Backend: Updates booking status to CONFIRMED
Backend: Records payment
         ↓
Returns: { success: true }
         ↓
Frontend: Shows "Payment successful!" message
```

## API Endpoints Used

### Events
```
POST   /api/events              → Create event
GET    /api/events/:id          → Get event details
POST   /api/events/:id/lock     → Lock seats
```

### Bookings
```
GET    /api/bookings            → Get all bookings
GET    /api/bookings/:id        → Get specific booking
POST   /api/bookings/confirm    → Confirm booking
```

### Payments
```
POST   /api/payments/:id/process → Process payment
```

### Cancellations
```
POST   /api/cancellations/:id   → Cancel booking
```

### Users
```
POST   /api/users               → Create user
GET    /api/users/:id           → Get user details
```

## State Management

### EventList Component
```javascript
states = {
  events: [],              // List of events to display
  loading: false,          // Show loading spinner
  error: '',              // Error message
  eventIdInput: ''        // Input field value
}
```

### EventDetails Component
```javascript
states = {
  event: null,            // Event details
  seats: 1,               // Number of seats to book
  loading: false,         // Show loading spinner
  error: '',              // Error message
  success: '',            // Success message
  lockId: null,           // After locking seats
  bookingId: null         // After confirming booking
}
```

### MyBookings Component
```javascript
states = {
  bookings: [],           // List of bookings
  loading: false,         // Show loading spinner
  error: '',              // Error message
  success: ''             // Success message
}
```

### CreateEvent Component
```javascript
states = {
  eventData: {            // Event form data
    name: '',
    description: '',
    eventDate: '',
    totalSeats: 10
  },
  userData: {             // User form data
    name: '',
    email: ''
  },
  loading: false,         // Show loading spinner
  error: '',              // Error message
  success: '',            // Success message
  createdEventId: '',     // After creating event
  showUserForm: false     // Toggle user form
}
```

## File Sizes (Approximate)

```
api.js              → 2 KB   (API functions)
App.js              → 2 KB   (Main app)
App.css             → 10 KB  (All styles)
EventList.js        → 3 KB   (Event list)
EventDetails.js     → 6 KB   (Booking flow)
MyBookings.js       → 4 KB   (Bookings list)
CreateEvent.js      → 5 KB   (Create forms)
```

## Technology Stack

```
Frontend:
├── React 19.2.4        (UI framework)
├── Axios 1.13.4        (HTTP requests)
├── UUID 13.0.0         (Generate unique IDs)
└── CSS3                (Styling)

Backend:
├── Express 4.22.1      (Web framework)
├── Mongoose 8.0.0      (MongoDB ODM)
├── Node-cron 4.2.1     (Scheduled jobs)
└── Winston 3.0.0       (Logging)

Database:
└── MongoDB             (NoSQL database)
```

## Request/Response Examples

### Lock Seats Request
```javascript
POST /api/events/65a1b2c3d4e5f6789/lock

Request Body:
{
  "seats": 2,
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
}

Response:
{
  "success": true,
  "data": {
    "lockId": "65a1b2c3d4e5f6790",
    "expiresAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Confirm Booking Request
```javascript
POST /api/bookings/confirm

Request Body:
{
  "lockId": "65a1b2c3d4e5f6790"
}

Response:
{
  "success": true,
  "data": {
    "booking": {
      "_id": "65a1b2c3d4e5f6791",
      "eventId": "65a1b2c3d4e5f6789",
      "userId": "65a1b2c3d4e5f6788",
      "seats": 2,
      "status": "PAYMENT_PENDING",
      "createdAt": "2024-01-15T10:25:00.000Z"
    }
  }
}
```

### Process Payment Request
```javascript
POST /api/payments/65a1b2c3d4e5f6791/process

Request Body:
{
  "status": "SUCCESS",
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440001"
}

Response:
{
  "success": true,
  "message": "Payment processed successfully"
}
```

## Security Features

1. **Idempotency Keys**: Prevent duplicate bookings/payments
2. **Seat Locking**: Prevents race conditions
3. **Expiry Times**: Locks and payments expire automatically
4. **Transaction Safety**: Database transactions ensure consistency
5. **Error Handling**: Graceful error messages

## Performance Considerations

1. **Lazy Loading**: Components load only when needed
2. **State Management**: Minimal re-renders
3. **API Caching**: Could be added for better performance
4. **Optimistic Updates**: Could be added for instant feedback

## Future Enhancements

- [ ] User authentication (login/signup)
- [ ] Real-time seat availability updates
- [ ] Search and filter events
- [ ] Event categories
- [ ] Payment gateway integration
- [ ] Email notifications
- [ ] Booking history with pagination
- [ ] Event images
- [ ] Reviews and ratings
- [ ] Admin dashboard

This architecture provides a solid foundation for a production-ready event booking system! 🚀
