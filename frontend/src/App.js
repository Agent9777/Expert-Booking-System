import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import ExpertListPage from './pages/ExpertListPage';
import ExpertDetailPage from './pages/ExpertDetailPage';
import BookingPage from './pages/BookingPage';
import MyBookingsPage from './pages/MyBookingsPage';
import './App.css';

function App() {
  return (
    <SocketProvider>
      <Router>
        <div className="app">
          <header className="header">
            <div className="header-inner">
              <NavLink to="/" className="logo">
                <span className="logo-icon">◆</span>
                <span className="logo-text">ExpertConnect</span>
              </NavLink>
              <nav className="nav">
                <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Experts
                </NavLink>
                <NavLink to="/my-bookings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  My Bookings
                </NavLink>
              </nav>
            </div>
          </header>
          <main className="main">
            <Routes>
              <Route path="/" element={<ExpertListPage />} />
              <Route path="/experts/:id" element={<ExpertDetailPage />} />
              <Route path="/book/:expertId" element={<BookingPage />} />
              <Route path="/my-bookings" element={<MyBookingsPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </SocketProvider>
  );
}

export default App;
