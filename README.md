# ExpertConnect — Real-Time Expert Session Booking System

A full-stack application built with **React + Node.js + Express + MongoDB + Socket.io**.

---

##  Project Structure

```
expert-booking/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── controllers/
│   │   ├── expertController.js    # Expert list + detail logic
│   │   └── bookingController.js   # Booking CRUD + race condition prevention
│   ├── models/
│   │   ├── Expert.js              # Expert + embedded time slots schema
│   │   └── Booking.js             # Booking schema with compound unique index
│   ├── routes/
│   │   ├── expertRoutes.js        # GET /experts, GET /experts/:id
│   │   └── bookingRoutes.js       # POST/GET/PATCH /bookings
│   ├── scripts/
│   │   └── seed.js                # Seed 8 experts with 2-week time slots
│   ├── .env
│   ├── package.json
│   └── server.js                  # Express + Socket.io server
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── context/
    │   │   └── SocketContext.js   # Socket.io React context
    │   ├── pages/
    │   │   ├── ExpertListPage.js  # Search, filter, pagination
    │   │   ├── ExpertDetailPage.js # Slots + real-time updates
    │   │   ├── BookingPage.js     # Booking form with validation
    │   │   └── MyBookingsPage.js  # Bookings by email + status
    │   ├── services/
    │   │   └── api.js             # Axios API service layer
    │   ├── App.js                 # Routes + layout
    │   └── App.css                # Global dark design system
    ├── .env
    └── package.json
```

---

##  Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`) OR MongoDB Atlas URI
- Rightnow works locally

### 1. Backend Setup

```bash
cd backend
npm install

# Edit .env and set your MONGODB_URI if using Atlas
# Then seed the database:no 
node scripts/seed.js
# Used to populate data in the database

# Start the server:
npm run dev        # with nodemon (development)
# OR
npm start          # production
```

Backend runs on: **http://localhost:5000**

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on: **http://localhost:3000**


##  Environment Variables

### Backend `.env`
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/expert-booking
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend `.env`
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```


##  Working
```
work.mp4
```
