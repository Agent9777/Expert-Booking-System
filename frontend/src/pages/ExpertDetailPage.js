import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { expertService } from '../services/api';
import { reservationService } from '../services/api';
import { useSocket } from '../context/SocketContext';

const AVATAR_COLORS = {
  Technology: ['#6c63ff', '#1a1a2e'],
  Finance: ['#22c55e', '#0a1f0f'],
  Health: ['#ef4444', '#1f0a0a'],
  Legal: ['#f59e0b', '#1f180a'],
  Marketing: ['#ec4899', '#1f0a14'],
  Design: ['#06b6d4', '#0a1a1f'],
  Business: ['#8b5cf6', '#150a1f'],
  Education: ['#3b82f6', '#0a101f'],
};

function Avatar({ name, category, size = 72 }) {
  const colors = AVATAR_COLORS[category] || ['#6c63ff', '#1a1a2e'];
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="profile-avatar"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${colors[1]}, ${colors[1]} 40%, ${colors[0]}22)`,
        border: `1.5px solid ${colors[0]}44`,
        color: colors[0], fontSize: size * 0.36,
      }}
    >
      {initials}
    </div>
  );
}

export default function ExpertDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [expert, setExpert] = useState(null);
  const [slotsByDate, setSlotsByDate] = useState({});
  const [reservedSlotIds, setReservedSlotIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [realtimeUpdates, setRealtimeUpdates] = useState([]);

  const fetchExpert = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [expertRes, reservationRes] = await Promise.all([
        expertService.getExpertById(id),
        reservationService.getReservations(id).catch(() => ({ data: { data: [] } })),
      ]);
      setExpert(expertRes.data.data);
      setSlotsByDate(expertRes.data.data.slotsByDate || {});
      const reservedIds = new Set((reservationRes.data.data || []).map((r) => r.slotId));
      setReservedSlotIds(reservedIds);
    } catch (err) {
      setError(err.displayMessage || 'Failed to load expert');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchExpert();
  }, [fetchExpert]);

  // Real-time slot updates via Socket.io
  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('join-expert-room', id);

    const handleSlotBooked = ({ slotId, date, startTime }) => {
      setSlotsByDate((prev) => {
        const updated = { ...prev };
        if (updated[date]) {
          updated[date] = updated[date].map((slot) =>
            slot._id === slotId ? { ...slot, isBooked: true } : slot
          );
        }
        return updated;
      });
      // Remove from reserved set too (it's now permanently booked)
      setReservedSlotIds((prev) => { const s = new Set(prev); s.delete(slotId); return s; });
      setRealtimeUpdates((prev) => [
        { type: 'booked', time: startTime, date, id: slotId },
        ...prev.slice(0, 2),
      ]);
      setTimeout(() => setRealtimeUpdates((prev) => prev.filter((u) => u.id !== slotId)), 4000);
    };

    const handleSlotReleased = ({ slotId, date }) => {
      setSlotsByDate((prev) => {
        const updated = { ...prev };
        if (updated[date]) {
          updated[date] = updated[date].map((slot) =>
            slot._id === slotId ? { ...slot, isBooked: false } : slot
          );
        }
        return updated;
      });
      setReservedSlotIds((prev) => { const s = new Set(prev); s.delete(slotId); return s; });
    };

    const handleSlotReserved = ({ slotId }) => {
      setReservedSlotIds((prev) => new Set([...prev, slotId]));
    };

    socket.on('slot-booked', handleSlotBooked);
    socket.on('slot-released', handleSlotReleased);
    socket.on('slot-reserved', handleSlotReserved);

    return () => {
      socket.emit('leave-expert-room', id);
      socket.off('slot-booked', handleSlotBooked);
      socket.off('slot-released', handleSlotReleased);
      socket.off('slot-reserved', handleSlotReserved);
    };
  }, [socket, id]);

  const handleSlotSelect = (slot, date) => {
    if (slot.isBooked) return;
    setSelectedSlot({ ...slot, date });
  };

  const handleBook = () => {
    if (!selectedSlot) return;
    navigate(`/book/${id}`, { state: { slot: selectedSlot, expert } });
  };

  const formatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'EEEE, MMMM d');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-state"><div className="spinner" /><p>Loading expert profile...</p></div>
      </div>
    );
  }

  if (error || !expert) {
    return (
      <div className="page">
        <div className="error-state">
          <div className="state-icon">⚠</div>
          <div className="state-title">Expert not found</div>
          <p className="state-msg">{error}</p>
          <Link to="/" className="btn btn-primary">Back to Experts</Link>
        </div>
      </div>
    );
  }

  const colors = AVATAR_COLORS[expert.category] || ['#6c63ff', '#1a1a2e'];

  return (
    <div className="page fade-in">
      <Link to="/" className="back-link">← All Experts</Link>

      {/* Real-time toast */}
      {realtimeUpdates.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '12px 18px', fontSize: 13,
          color: 'var(--text-secondary)', boxShadow: 'var(--shadow)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeIn 0.3s ease',
        }}>
          <span style={{ color: 'var(--amber)' }}>⚡</span>
          Slot at {realtimeUpdates[0].time} on {formatDate(realtimeUpdates[0].date)} was just booked
        </div>
      )}

      <div className="detail-layout">
        {/* Sidebar */}
        <aside className="expert-sidebar">
          <div className="card expert-profile-card">
            <Avatar name={expert.name} category={expert.category} />
            <div className="profile-name">{expert.name}</div>
            <span className="badge badge-purple">{expert.category}</span>
            <p className="profile-bio">{expert.bio}</p>

            <div className="profile-stat">
              <span className="profile-stat-label">Experience</span>
              <span className="profile-stat-val">{expert.experience} years</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-label">Rating</span>
              <span className="profile-stat-val" style={{ color: 'var(--amber)' }}>
                ★ {expert.rating} ({expert.totalReviews} reviews)
              </span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-label">Session Rate</span>
              <span className="profile-stat-val" style={{ color: colors[0] }}>
                ₹{expert.hourlyRate?.toLocaleString('en-IN')} / hr
              </span>
            </div>

            {expert.tags?.length > 0 && (
              <div className="tags">
                {expert.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}

            {selectedSlot && (
              <div style={{ marginTop: 20 }}>
                <div style={{
                  background: 'var(--accent-dim)', border: '1px solid rgba(108,99,255,0.25)',
                  borderRadius: 10, padding: '12px 14px', fontSize: 13, marginBottom: 12,
                  color: 'var(--accent-light)',
                }}>
                  ✓ Selected: {formatDate(selectedSlot.date)} at {selectedSlot.startTime}
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleBook}>
                  Book This Slot →
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Slots */}
        <div className="slots-section">
          <div className="slots-title">
            Available Slots
            <div className="realtime-indicator">
              <div className="dot-live" />
              Live
            </div>
          </div>

          {Object.keys(slotsByDate).length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="state-icon">📅</div>
              <div className="state-title">No slots available</div>
              <p className="state-msg">Check back soon for upcoming availability</p>
            </div>
          ) : (
            Object.entries(slotsByDate).map(([date, slots]) => (
              <div key={date} className="date-group">
                <div className="date-label">{formatDate(date)}</div>
                <div className="slots-row">
                  {slots.map((slot) => {
                    const isReserved = !slot.isBooked && reservedSlotIds.has(slot._id);
                    return (
                      <button
                        key={slot._id}
                        className={`slot-btn ${slot.isBooked ? 'slot-booked' : isReserved ? 'slot-reserved' : ''} ${
                          selectedSlot?._id === slot._id ? 'slot-selected' : ''
                        }`}
                        disabled={slot.isBooked || isReserved}
                        onClick={() => handleSlotSelect(slot, date)}
                        title={
                          slot.isBooked
                            ? 'Already booked'
                            : isReserved
                            ? 'Being reserved by someone — check back in a few minutes'
                            : `${slot.startTime} – ${slot.endTime}`
                        }
                      >
                        {slot.startTime}
                        {slot.isBooked && ' ✗'}
                        {isReserved && ' 🔒'}
                      </button>
                    );
                  })}
                </div>              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
