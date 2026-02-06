# 🚀 Quick Start Guide

## Step-by-Step Instructions for First Time Users

### 1️⃣ Start the Backend
Open a terminal and run:
```bash
cd /home/hello/Documents/event-booking-backend
npm start
```
✅ You should see: "Server running on port 3000"

### 2️⃣ Start the Frontend
Open a **NEW** terminal (keep backend running) and run:
```bash
cd /home/hello/Documents/event-booking-frontend
npm start
```
✅ Browser will open automatically at http://localhost:3001

### 3️⃣ Create Your First Event

1. Click **"Create Event"** button (top right)
2. Fill in the form:
   - Name: `My First Event`
   - Description: `This is a test event`
   - Date: Pick any future date
   - Seats: `10`
3. Click **"Create Event"**
4. **IMPORTANT**: Copy the Event ID that appears (looks like: `65a1b2c3d4e5f6789`)

### 4️⃣ Add Event to List

1. Click **"All Events"** button (top left)
2. Paste the Event ID in the input box
3. Click **"Add Event"**
4. You'll see your event appear as a card!

### 5️⃣ Book the Event

1. Click on the event card
2. You'll see 3 steps:

**Step 1: Lock Seats**
- Choose number of seats (e.g., 2)
- Click "🔒 Lock Seats"
- You'll get a Lock ID

**Step 2: Confirm Booking**
- Click "✔️ Confirm Booking"
- You'll get a Booking ID

**Step 3: Pay**
- Click "💳 Pay Now (Success)"
- Booking complete! ✅

### 6️⃣ View Your Booking

1. Click **"My Bookings"** button (top right)
2. You'll see your booking with status "CONFIRMED"
3. You can cancel it if you want (50% refund)

## 🎉 That's it!

You've successfully:
- ✅ Created an event
- ✅ Booked seats
- ✅ Completed payment
- ✅ Viewed your booking

## 🧪 Try Different Scenarios

### Test Payment Failure
- Book another event
- At payment step, click "❌ Simulate Failure"
- See how the system handles it

### Test Payment Timeout
- Book another event
- At payment step, click "⏱️ Simulate Timeout"
- See the booking status

### Cancel a Booking
- Go to "My Bookings"
- Click "Cancel Booking" on a confirmed booking
- You'll get 50% refund

## 📱 What Each Button Does

### Top Navigation
- **All Events**: Shows list of events you've added
- **Create Event**: Form to create new events
- **My Bookings**: Shows all your bookings

### Event Details Page
- **🔒 Lock Seats**: Reserves seats temporarily (5 minutes)
- **✔️ Confirm Booking**: Creates the booking
- **💳 Pay Now**: Completes the payment
- **❌ Simulate Failure**: Tests payment failure
- **⏱️ Simulate Timeout**: Tests payment timeout

### My Bookings Page
- **🔄 Refresh**: Updates the bookings list
- **Cancel Booking**: Cancels a booking (50% refund)

## 🎨 Understanding the Colors

### Status Colors
- 🟢 **Green (CONFIRMED)**: Booking successful
- 🟠 **Orange (PAYMENT_PENDING)**: Waiting for payment
- 🔴 **Red (CANCELLED)**: Booking cancelled
- 🔴 **Dark Red (PAYMENT_FAILED)**: Payment failed

## 💡 Pro Tips

1. **Keep both terminals open**: Backend and frontend need to run together
2. **Copy Event IDs**: You'll need them to add events to the list
3. **Refresh bookings**: Click refresh to see latest status
4. **Check available seats**: They update in real-time

## ❓ Common Questions

**Q: Why do I need to enter Event ID manually?**
A: Your backend doesn't have a "get all events" endpoint yet. This is a simple workaround.

**Q: Can I create multiple events?**
A: Yes! Create as many as you want and add them all to the list.

**Q: What happens if I close the browser?**
A: Your data is in MongoDB, so it's saved. Just add the event IDs again.

**Q: Can multiple people book the same event?**
A: Yes! Your backend handles concurrent bookings with seat locking.

## 🐛 Something Not Working?

1. **Check both terminals are running**
2. **Make sure backend is on port 3000**
3. **Check browser console for errors** (Press F12)
4. **Try refreshing the page**

Need help? Check the main README.md for more details!

Happy booking! 🎫✨
