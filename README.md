# Event Booking Frontend

This is the frontend for your Event Booking System. It's built with React and connects to your backend API.

## 📁 Project Structure

```
src/
├── api.js                      # All API calls to backend
├── App.js                      # Main app with navigation
├── App.css                     # All styling
└── components/
    ├── EventList.js           # Shows list of events
    ├── EventDetails.js        # Book an event (lock → confirm → pay)
    ├── MyBookings.js          # View and cancel bookings
    └── CreateEvent.js         # Create new events and users
```

## 🚀 How to Run

### Step 1: Start Your Backend
First, make sure your backend is running:
```bash
cd /home/hello/Documents/event-booking-backend
npm start
```
Your backend should be running on `http://localhost:3000`

### Step 2: Start the Frontend
Open a new terminal and run:
```bash
cd /home/hello/Documents/event-booking-frontend
npm start
```
The frontend will open automatically at `http://localhost:3001` (or 3002 if 3001 is busy)

## 📖 How to Use the App

### 1. Create an Event
- Click "Create Event" button in the top navigation
- Fill in the event details:
  - Event name (e.g., "Rock Concert 2024")
  - Description
  - Date and time
  - Total seats
- Click "Create Event"
- **Copy the Event ID** that appears (you'll need it!)

### 2. Add Event to List
- Go back to "All Events"
- Paste the Event ID in the input box
- Click "Add Event"
- The event will appear as a card

### 3. Book an Event
- Click on any event card
- You'll see the event details
- Follow these 3 steps:
  1. **Lock Seats**: Choose number of seats and click "Lock Seats"
  2. **Confirm Booking**: Click "Confirm Booking" 
  3. **Pay**: Click "Pay Now (Success)" to complete booking

### 4. View Your Bookings
- Click "My Bookings" in the top navigation
- You'll see all bookings with their status
- You can cancel confirmed bookings (50% refund)

## 🎨 Features

### Event List Page
- Add events by ID
- See available seats
- Click to view details

### Event Details Page
- Complete booking flow (Lock → Confirm → Pay)
- Test different payment scenarios:
  - ✅ Success
  - ❌ Failure
  - ⏱️ Timeout

### My Bookings Page
- View all bookings
- See booking status (CONFIRMED, PAYMENT_PENDING, etc.)
- Cancel bookings

### Create Event Page
- Create new events
- Create new users (optional)
- Copy event IDs easily

## 🔧 Configuration

If your backend runs on a different port, edit `src/api.js`:
```javascript
const API_BASE_URL = 'http://localhost:YOUR_PORT/api';
```

## 📝 Understanding the Code

### api.js
This file has all functions to talk to your backend:
- `createEvent()` - Creates a new event
- `lockSeats()` - Locks seats temporarily
- `confirmBooking()` - Confirms the booking
- `processPayment()` - Processes payment
- And more...

### App.js
The main component that:
- Shows navigation bar
- Switches between different pages
- Manages which page to show

### Components
Each component is a separate page:
- **EventList**: Shows all events in a grid
- **EventDetails**: Handles the booking process
- **MyBookings**: Shows user's bookings
- **CreateEvent**: Form to create events

### App.css
All the styling to make the app look nice:
- Colors, spacing, layouts
- Responsive design for mobile
- Button styles and animations

## 🎯 Booking Flow

```
1. User sees event list
   ↓
2. User clicks on event
   ↓
3. User locks seats (reserves temporarily)
   ↓
4. User confirms booking
   ↓
5. User makes payment
   ↓
6. Booking complete! ✅
```

## 🐛 Troubleshooting

### "Failed to fetch event"
- Make sure your backend is running
- Check if the Event ID is correct
- Check browser console for errors

### "Network Error"
- Backend might not be running
- Check if backend is on `http://localhost:3000`
- Check CORS settings in backend

### Events not showing
- You need to manually add events by ID
- Create an event first, then add it to the list

## 💡 Tips

1. **Create a user first** if you want to track bookings by user
2. **Copy Event IDs** after creating events
3. **Refresh bookings** to see latest status
4. **Test payment scenarios** to see how the system handles failures

## 🎓 Learning Notes

- **State**: Used to store data (like events, bookings)
- **useEffect**: Runs code when component loads
- **async/await**: Waits for API responses
- **Props**: Pass data between components
- **Event handlers**: Functions that run when you click buttons

Enjoy building with your Event Booking System! 🎉
