import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { bookingService } from '../services/api';

const STATUS_BADGE = {
  Pending: 'badge-amber',
  Confirmed: 'badge-blue',
  Completed: 'badge-green',
  Cancelled: 'badge-gray',
};

const STATUS_ICON = {
  Pending: '⏳',
  Confirmed: '✓',
  Completed: '★',
  Cancelled: '✗',
};

function BookingCard({ booking }) {
  const formatDate = (dateStr) => {
    try { return format(parseISO(dateStr), 'EEE, MMM d, yyyy'); }
    catch { return dateStr; }
  };

  const formatCreated = (isoStr) => {
    try { return format(new Date(isoStr), 'MMM d, yyyy h:mm a'); }
    catch { return ''; }
  };

  return (
    <div className="card booking-item fade-in">
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>
        {STATUS_ICON[booking.status]}
      </div>

      <div className="booking-item-main">
        <div className="booking-expert-name">{booking.expertName}</div>
        <div className="booking-date">
          📅 {formatDate(booking.date)} · {booking.startTime} – {booking.endTime}
        </div>
        {booking.notes && (
          <div className="booking-notes">"{booking.notes}"</div>
        )}
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
          Booked on {formatCreated(booking.createdAt)}
        </div>
      </div>

      <div>
        <span className={`badge ${STATUS_BADGE[booking.status] || 'badge-gray'}`}>
          {booking.status}
        </span>
      </div>
    </div>
  );
}

export default function MyBookingsPage() {
  const [email, setEmail] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();

    if (!trimmed) { setError('Please enter your email address'); return; }
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) { setError('Please enter a valid email address'); return; }

    setError('');
    setLoading(true);
    setSearched(false);

    try {
      const res = await bookingService.getBookingsByEmail(trimmed);
      setBookings(res.data.data);
      setSearched(true);
    } catch (err) {
      setError(err.displayMessage || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const statusCounts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">My Bookings<span className="accent-dot">.</span></h1>
        <p className="page-subtitle">Enter your email to view all your sessions</p>
      </div>

      <form className="email-search" onSubmit={handleSearch} noValidate>
        <input
          className={`form-input ${error ? 'error' : ''}`}
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          autoComplete="email"
        />
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Find Bookings →'}
        </button>
      </form>

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 14, marginBottom: 16, marginTop: -8 }}>
          ⚠ {error}
        </div>
      )}

      {loading && (
        <div className="loading-state"><div className="spinner" /><p>Fetching your bookings...</p></div>
      )}

      {searched && !loading && (
        <>
          {bookings.length === 0 ? (
            <div className="empty-state">
              <div className="state-icon">📭</div>
              <div className="state-title">No bookings found</div>
              <p className="state-msg">No sessions found for <strong>{email}</strong>. Double-check the email or book a session with an expert!</p>
            </div>
          ) : (
            <>
              {/* Summary strip */}
              <div style={{
                display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24,
              }}>
                <span className="badge badge-gray">{bookings.length} Total</span>
                {Object.entries(statusCounts).map(([status, count]) => (
                  <span key={status} className={`badge ${STATUS_BADGE[status] || 'badge-gray'}`}>
                    {STATUS_ICON[status]} {count} {status}
                  </span>
                ))}
              </div>

              <div className="bookings-list">
                {bookings.map((booking) => (
                  <BookingCard key={booking._id} booking={booking} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
