import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { bookingService, reservationService } from '../services/api';
import { useSocket } from '../context/SocketContext';

const LOCK_SECONDS = 5 * 60;

const validate = (fields) => {
  const errors = {};
  if (!fields.clientName.trim() || fields.clientName.trim().length < 2)
    errors.clientName = 'Name must be at least 2 characters';
  if (!fields.clientEmail.trim() || !/^\S+@\S+\.\S+$/.test(fields.clientEmail))
    errors.clientEmail = 'Enter a valid email address';
  if (!fields.clientPhone.trim() || !/^[0-9+\-\s()]{7,15}$/.test(fields.clientPhone))
    errors.clientPhone = 'Enter a valid phone number (7–15 digits)';
  if (fields.notes.length > 500)
    errors.notes = 'Notes cannot exceed 500 characters';
  return errors;
};

function getSessionId() {
  let id = sessionStorage.getItem('bookingSessionId');
  if (!id) {
    id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('bookingSessionId', id);
  }
  return id;
}

function formatSeconds(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return m + ':' + s;
}

export default function BookingPage() {
  const { expertId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { slot, expert } = location.state || {};

  const sessionId = useRef(getSessionId()).current;

  const [lockStatus, setLockStatus] = useState('locking');
  const [lockError, setLockError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(LOCK_SECONDS);
  const timerRef = useRef(null);
  const releaseCalledRef = useRef(false);

  const [fields, setFields] = useState({ clientName: '', clientEmail: '', clientPhone: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);
  const [bookingData, setBookingData] = useState(null);

  const formatSlotDate = () => {
    try { return format(parseISO(slot.date), 'EEEE, MMMM d, yyyy'); }
    catch { return slot ? slot.date : ''; }
  };

  const releaseReservation = useCallback(async () => {
    if (releaseCalledRef.current || !slot || !expertId) return;
    releaseCalledRef.current = true;
    clearInterval(timerRef.current);
    try {
      await reservationService.releaseSlot({ expertId, slotId: slot._id, sessionId });
    } catch (_) {}
    if (socket) socket.emit('clear-reservation');
  }, [expertId, slot, sessionId, socket]);

  useEffect(() => {
    if (!slot || !expert) return;
    let cancelled = false;

    const acquireLock = async () => {
      try {
        const res = await reservationService.lockSlot({
          expertId,
          slotId: slot._id,
          date: slot.date,
          startTime: slot.startTime,
          sessionId,
        });
        if (cancelled) return;
        if (res.data.success) {
          setLockStatus('locked');
          if (socket) {
            socket.emit('hold-reservation', {
              expertId, slotId: slot._id, sessionId,
              date: slot.date, startTime: slot.startTime,
            });
          }
          const expiresAt = new Date(res.data.expiresAt).getTime();
          timerRef.current = setInterval(() => {
            const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
            if (remaining <= 0) {
              clearInterval(timerRef.current);
              if (!cancelled) setLockStatus('expired');
            } else {
              if (!cancelled) setSecondsLeft(remaining);
            }
          }, 1000);
        }
      } catch (err) {
        if (cancelled) return;
        setLockStatus('failed');
        setLockError(
          (err.response && err.response.data && err.response.data.message) ||
          err.displayMessage ||
          'Could not reserve slot.'
        );
      }
    };

    acquireLock();
    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (lockStatus === 'locked' && slot) {
        const body = JSON.stringify({ expertId, slotId: slot._id, sessionId });
        const url = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api') + '/reservations/release';
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (lockStatus === 'locked' && !success) releaseReservation();
    };
  }, [lockStatus, success, releaseReservation]); 

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockStatus !== 'locked') return;
    const validationErrors = validate(fields);
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    setSubmitting(true);
    setApiError('');
    try {
      const payload = {
        expertId,
        slotId: slot._id,
        clientName: fields.clientName.trim(),
        clientEmail: fields.clientEmail.trim(),
        clientPhone: fields.clientPhone.trim(),
        date: slot.date,
        startTime: slot.startTime,
        notes: fields.notes.trim(),
        sessionId,
      };
      const res = await bookingService.createBooking(payload);
      clearInterval(timerRef.current);
      releaseCalledRef.current = true;
      if (socket) socket.emit('clear-reservation');
      setBookingData(res.data.data);
      setSuccess(true);
    } catch (err) {
      setApiError(err.displayMessage || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!slot || !expert) {
    return (
      <div className="page">
        <div className="error-state">
          <div className="state-icon">⚠</div>
          <div className="state-title">No slot selected</div>
          <p className="state-msg">Please go back and select a time slot first.</p>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  if (lockStatus === 'locking') {
    return (
      <div className="page">
        <div className="loading-state">
          <div className="spinner" />
          <p>Reserving your slot…</p>
        </div>
      </div>
    );
  }

  if (lockStatus === 'failed') {
    return (
      <div className="page">
        <div className="booking-layout">
          <div style={{
            background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 20, padding: 40, textAlign: 'center',
          }} className="fade-in">
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--red)', marginBottom: 8 }}>
              Slot Unavailable
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{lockError}</p>
            <button className="btn btn-primary" onClick={() => navigate('/experts/' + expertId)}>
              ← Choose Another Slot
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (lockStatus === 'expired') {
    return (
      <div className="page">
        <div className="booking-layout">
          <div style={{
            background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 20, padding: 40, textAlign: 'center',
          }} className="fade-in">
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--amber)', marginBottom: 8 }}>
              Reservation Expired
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              Your 5-minute hold has expired. Please go back and select the slot again.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/experts/' + expertId)}>
              ← Back to {expert.name}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success && bookingData) {
    return (
      <div className="page">
        <div className="booking-layout">
          <div className="success-box fade-in">
            <div className="success-icon">✓</div>
            <div className="success-title">Booking Confirmed!</div>
            <p className="success-msg">
              Your session with <strong>{expert.name}</strong> is booked for{' '}
              <strong>{formatSlotDate()}</strong> at <strong>{slot.startTime}</strong>.
              <br />A confirmation will be sent to <strong>{bookingData.clientEmail}</strong>.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => navigate('/my-bookings')}>View My Bookings</button>
              <button className="btn btn-secondary" onClick={() => navigate('/')}>Browse More Experts</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isWarning = secondsLeft <= 60;
  const isCritical = secondsLeft <= 30;

  return (
    <div className="page">
      <Link
        to={'/experts/' + expertId}
        className="back-link"
        onClick={() => { if (lockStatus === 'locked') releaseReservation(); }}
      >
        ← Back to {expert.name}
      </Link>

      <div className="booking-layout">
        <div className="page-header">
          <h1 className="page-title">Book a Session<span className="accent-dot">.</span></h1>
          <p className="page-subtitle">Fill in your details to confirm the appointment</p>
        </div>

        <div className="booking-summary" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>📅</span>
            <div>
              <strong>{expert.name}</strong> — {expert.category}
              <br />
              <span>{formatSlotDate()} · {slot.startTime} – {slot.endTime}</span>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 10,
            background: isCritical ? 'var(--red-dim)' : isWarning ? 'var(--amber-dim)' : 'var(--green-dim)',
            border: '1px solid ' + (isCritical ? 'rgba(239,68,68,0.25)' : isWarning ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.25)'),
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isCritical ? 'var(--red)' : isWarning ? 'var(--amber)' : 'var(--green)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: isCritical ? 'var(--red)' : isWarning ? 'var(--amber)' : 'var(--green)',
              fontVariantNumeric: 'tabular-nums',
              fontFamily: 'var(--font-display)',
              letterSpacing: 1,
            }}>
              🔒 {formatSeconds(secondsLeft)}
            </span>
          </div>
        </div>

        {isWarning && !isCritical && (
          <div style={{
            background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 10, padding: '10px 16px', marginBottom: 12,
            fontSize: 13, color: 'var(--amber)',
          }}>
            ⚠ Under a minute left — submit soon or your slot will be released to others.
          </div>
        )}

        {isCritical && (
          <div style={{
            background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 10, padding: '10px 16px', marginBottom: 12,
            fontSize: 13, color: 'var(--red)',
          }}>
            🚨 Hurry! Reservation expires in {secondsLeft}s.
          </div>
        )}

        <div className="card booking-card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className={'form-input' + (errors.clientName ? ' error' : '')}
                  name="clientName" value={fields.clientName} onChange={handleChange}
                  placeholder="Your full name" autoComplete="name" />
                {errors.clientName && <div className="field-error">{errors.clientName}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input className={'form-input' + (errors.clientEmail ? ' error' : '')}
                  name="clientEmail" type="email" value={fields.clientEmail} onChange={handleChange}
                  placeholder="you@email.com" autoComplete="email" />
                {errors.clientEmail && <div className="field-error">{errors.clientEmail}</div>}
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input className={'form-input' + (errors.clientPhone ? ' error' : '')}
                  name="clientPhone" type="tel" value={fields.clientPhone} onChange={handleChange}
                  placeholder="+91 98765 43210" autoComplete="tel" />
                {errors.clientPhone && <div className="field-error">{errors.clientPhone}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" value={formatSlotDate()} readOnly
                  style={{ color: 'var(--text-secondary)', cursor: 'default' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Time Slot</label>
              <input className="form-input" value={slot.startTime + ' – ' + slot.endTime} readOnly
                style={{ color: 'var(--text-secondary)', cursor: 'default' }} />
            </div>

            <div className="form-group">
              <label className="form-label">
                Notes / Agenda{' '}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
              </label>
              <textarea className={'form-textarea' + (errors.notes ? ' error' : '')}
                name="notes" value={fields.notes} onChange={handleChange}
                placeholder="What would you like to discuss?" maxLength={500} />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{fields.notes.length}/500</div>
              </div>
            </div>

            {apiError && (
              <div style={{
                background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                color: 'var(--red)', fontSize: 14,
              }}>
                ⚠ {apiError}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}
              disabled={submitting || lockStatus !== 'locked'}>
              {submitting ? 'Confirming…' : 'Confirm Booking →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
