# 📚 Code Explanation for Beginners

This document explains the code in simple terms so you can understand how everything works.

## 🗂️ File Structure

```
event-booking-frontend/
│
├── src/
│   ├── api.js              ← Talks to backend
│   ├── App.js              ← Main app (navigation)
│   ├── App.css             ← Makes it look pretty
│   │
│   └── components/
│       ├── EventList.js    ← Shows events
│       ├── EventDetails.js ← Book events
│       ├── MyBookings.js   ← View bookings
│       └── CreateEvent.js  ← Create events
│
├── package.json            ← Project info & dependencies
├── README.md               ← Full documentation
└── QUICKSTART.md          ← Quick start guide
```

## 📄 Understanding Each File

### 1. api.js - The Messenger

**What it does**: Sends requests to your backend and gets responses

**Simple explanation**: 
Think of it like a phone. When you want to book an event, this file "calls" your backend and asks it to book the event.

**Key functions**:
```javascript
// Create a new event
createEvent(eventData) 
  → Sends event info to backend
  → Backend saves it in database
  → Returns event ID

// Lock seats
lockSeats(eventId, seats, key)
  → Tells backend: "Reserve these seats for me"
  → Backend locks them for 5 minutes
  → Returns lock ID

// Confirm booking
confirmBooking(lockId)
  → Tells backend: "I want to book those locked seats"
  → Backend creates a booking
  → Returns booking ID

// Process payment
processPayment(bookingId, paymentData)
  → Tells backend: "Here's my payment"
  → Backend processes it
  → Returns success/failure
```

### 2. App.js - The Controller

**What it does**: Controls which page you see

**Simple explanation**:
Like a TV remote that switches channels. When you click "All Events", it shows the EventList page. When you click "My Bookings", it shows the MyBookings page.

**Key parts**:
```javascript
// Stores which page to show
const [currentPage, setCurrentPage] = useState('events');

// Navigation bar with buttons
<nav className="navbar">
  <button onClick={goToEvents}>All Events</button>
  <button onClick={goToBookings}>My Bookings</button>
</nav>

// Shows different pages based on currentPage
{currentPage === 'events' && <EventList />}
{currentPage === 'bookings' && <MyBookings />}
```

### 3. EventList.js - The Event Display

**What it does**: Shows all events in a nice grid

**Simple explanation**:
Like a shopping website showing products. Each event is a card you can click on.

**How it works**:
1. You enter an Event ID
2. It calls `getEventById()` from api.js
3. Backend sends event details
4. It adds the event to the list
5. Shows it as a card

**Key parts**:
```javascript
// Stores list of events
const [events, setEvents] = useState([]);

// Function to add event
const addEventById = async () => {
  // Call backend
  const response = await getEventById(eventIdInput);
  
  // Add to list
  setEvents([...events, response.data]);
}

// Display events
{events.map((event) => (
  <div className="event-card">
    <h3>{event.name}</h3>
    <p>{event.description}</p>
  </div>
))}
```

### 4. EventDetails.js - The Booking Page

**What it does**: Handles the complete booking process

**Simple explanation**:
Like buying a movie ticket online:
1. Select seats → Lock them
2. Confirm → Create booking
3. Pay → Complete purchase

**The 3 steps**:

**Step 1: Lock Seats**
```javascript
const handleLockSeats = async () => {
  // Generate unique key (prevents duplicate bookings)
  const key = uuidv4();
  
  // Call backend to lock seats
  const response = await lockSeats(eventId, seats, key);
  
  // Save lock ID
  setLockId(response.data.lockId);
}
```

**Step 2: Confirm Booking**
```javascript
const handleConfirmBooking = async () => {
  // Call backend to confirm
  const response = await confirmBooking(lockId);
  
  // Save booking ID
  setBookingId(response.data.booking._id);
}
```

**Step 3: Process Payment**
```javascript
const handlePayment = async (status) => {
  // Generate unique payment key
  const key = uuidv4();
  
  // Call backend to process payment
  await processPayment(bookingId, { status, key });
}
```

### 5. MyBookings.js - The Bookings List

**What it does**: Shows all your bookings

**Simple explanation**:
Like your order history on Amazon. Shows what you've booked and lets you cancel.

**How it works**:
1. Calls `getAllBookings()` when page loads
2. Backend sends all bookings
3. Displays them as cards
4. Shows status with colors

**Key parts**:
```javascript
// Fetch bookings when page loads
useEffect(() => {
  fetchBookings();
}, []);

// Function to get bookings
const fetchBookings = async () => {
  const response = await getAllBookings();
  setBookings(response.data);
}

// Cancel booking
const handleCancelBooking = async (bookingId) => {
  await cancelBooking(bookingId);
  fetchBookings(); // Refresh list
}
```

### 6. CreateEvent.js - The Event Creator

**What it does**: Form to create new events

**Simple explanation**:
Like creating a Facebook event. Fill in details and submit.

**How it works**:
1. You fill in the form
2. Click "Create Event"
3. It sends data to backend
4. Backend saves it in database
5. Returns Event ID

**Key parts**:
```javascript
// Store form data
const [eventData, setEventData] = useState({
  name: '',
  description: '',
  eventDate: '',
  totalSeats: 10,
});

// Update form when you type
const handleEventChange = (e) => {
  setEventData({
    ...eventData,
    [e.target.name]: e.target.value,
  });
}

// Submit form
const handleCreateEvent = async (e) => {
  e.preventDefault(); // Don't reload page
  
  // Call backend
  const response = await createEvent(eventData);
  
  // Show Event ID
  setCreatedEventId(response.data._id);
}
```

## 🔄 How Data Flows

### Example: Booking an Event

```
1. User clicks "Lock Seats" button
   ↓
2. EventDetails.js calls handleLockSeats()
   ↓
3. handleLockSeats() calls lockSeats() from api.js
   ↓
4. api.js sends HTTP request to backend
   ↓
5. Backend locks seats in database
   ↓
6. Backend sends back lock ID
   ↓
7. api.js receives response
   ↓
8. EventDetails.js saves lock ID
   ↓
9. User sees success message
```

## 🎨 Understanding React Concepts

### State (useState)
**What**: Stores data that can change
**Example**: 
```javascript
const [seats, setSeats] = useState(1);
// seats = current value (1)
// setSeats = function to change it
```

### Effects (useEffect)
**What**: Runs code when component loads
**Example**:
```javascript
useEffect(() => {
  fetchBookings(); // Runs when page loads
}, []);
```

### Props
**What**: Pass data from parent to child
**Example**:
```javascript
// App.js passes eventId to EventDetails
<EventDetails eventId={selectedEventId} />

// EventDetails receives it
function EventDetails({ eventId }) {
  // Use eventId here
}
```

### Async/Await
**What**: Waits for backend response
**Example**:
```javascript
// Without async/await (confusing)
lockSeats().then(response => {
  console.log(response);
});

// With async/await (cleaner)
const response = await lockSeats();
console.log(response);
```

## 🎯 Common Patterns

### Loading State
```javascript
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  setLoading(true);        // Show loading
  await callBackend();     // Wait for response
  setLoading(false);       // Hide loading
}
```

### Error Handling
```javascript
try {
  await callBackend();     // Try to call backend
  setSuccess('It worked!');
} catch (err) {
  setError('It failed!');  // If error, show message
}
```

### Conditional Rendering
```javascript
// Show different things based on conditions
{loading && <p>Loading...</p>}
{error && <p>Error: {error}</p>}
{success && <p>Success!</p>}
```

## 💡 Tips for Understanding Code

1. **Read comments**: Every file has comments explaining what it does
2. **Follow the flow**: Start from button click → function → API call → response
3. **Console.log**: Add `console.log()` to see what's happening
4. **One step at a time**: Don't try to understand everything at once
5. **Experiment**: Change values and see what happens

## 🔍 Debugging Tips

### See what's happening
```javascript
console.log('Event ID:', eventId);
console.log('Response:', response);
console.log('Bookings:', bookings);
```

### Check if function runs
```javascript
const handleClick = () => {
  console.log('Button clicked!');
  // rest of code
}
```

### See errors
```javascript
try {
  await callBackend();
} catch (err) {
  console.error('Error:', err);
  console.error('Error message:', err.message);
}
```

## 📖 Learning Resources

- **React Docs**: https://react.dev
- **JavaScript Async/Await**: https://javascript.info/async-await
- **Axios (HTTP requests)**: https://axios-http.com

## 🎓 Next Steps

1. **Understand the flow**: Follow one booking from start to finish
2. **Modify something**: Change button text, colors, etc.
3. **Add a feature**: Try adding a search box for events
4. **Read React docs**: Learn more about useState and useEffect

Remember: Every expert was once a beginner. Take your time and enjoy learning! 🚀
