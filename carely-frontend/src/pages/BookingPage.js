import React, { useState, useEffect, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api, { API_BASE } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import AppNavbar from '../components/AppNavbar';
import { MapPin, Star } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBR = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };
const DAY_BY_INDEX = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const fileUrl = (p) => {
  if (!p) return null;
  const name = String(p).split(/[\\/]/).pop();
  return `${API_BASE}/uploads/documents/${name}`;
};

const formatLocation = (loc) => {
  if (!loc) return 'Location not set';
  return [loc.thana, loc.district].filter(Boolean).join(', ') || 'Location not set';
};

const formatAvailability = (avail) => {
  if (!avail) return 'Not specified';
  const days = Object.entries(avail).filter(([, v]) => v?.start && v?.end).map(([k]) => DAY_ABBR[k] || k);
  return days.length ? days.join(', ') : 'Not specified';
};

const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const toHHMM = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

const getDayType = (dateStr) => {
  const dow = new Date(dateStr).getDay();
  if (dow === 6) return 'saturday';
  if (dow === 0) return 'sunday';
  return 'weekday';
};

const getAppliedRate = (dateStr, pro) => {
  const type = getDayType(dateStr);
  if (type === 'saturday' && pro.saturdayRate > 0) return pro.saturdayRate;
  if (type === 'sunday' && pro.sundayRate > 0) return pro.sundayRate;
  if (pro.weekdayRate > 0) return pro.weekdayRate;
  return pro.hourlyRate || 0;
};

export default function BookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [pro, setPro] = useState(null);
  const [proLoaded, setProLoaded] = useState(false);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
  const loading = !proLoaded || !availabilityLoaded;
  const [error, setError] = useState('');
  const [submitState, setSubmitState] = useState('idle'); // idle | submitting | success | error
  const [confirmation, setConfirmation] = useState(null);

  // Everything needed to render a fully-blocking calendar + time grid, fetched
  // once so the UI can disable invalid dates/times before the user ever submits.
  const [workingWeekdays, setWorkingWeekdays] = useState([]); // [0..6], 0=Sunday
  const [availability, setAvailability] = useState({}); // { Monday: {start,end}, ... }
  const [bookedSlots, setBookedSlots] = useState({}); // { '2025-01-15': [{startTime,endTime}] }

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');

  const [duration, setDuration] = useState(1);
  const [type, setType] = useState('short');
  const [recurringDays, setRecurringDays] = useState([]);
  const [address, setAddress] = useState('');
  const [workDescription, setWorkDescription] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    api.get(`/api/users/${id}`)
      .then((res) => setPro(res.data))
      .catch(() => setError('Failed to load professional'))
      .finally(() => setProLoaded(true));
  }, [id]);

  useEffect(() => {
    api.get(`/api/bookings/availability/${id}`)
      .then((res) => {
        setWorkingWeekdays(res.data.workingWeekdays || []);
        setAvailability(res.data.availability || {});
        setBookedSlots(res.data.bookedSlots || {});
      })
      .catch(() => {
        setWorkingWeekdays([]);
        setAvailability({});
        setBookedSlots({});
      })
      .finally(() => setAvailabilityLoaded(true));
  }, [id]);

  const getDaySchedule = (date) => availability[DAY_BY_INDEX[date.getDay()]];

  const isDateAvailable = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return false;
    if (!workingWeekdays.includes(date.getDay())) return false;

    const daySchedule = getDaySchedule(date);
    if (!daySchedule?.start || !daySchedule?.end) return false;

    const dayBookings = bookedSlots[toDateStr(date)] || [];
    const availableMins = toMin(daySchedule.end) - toMin(daySchedule.start);
    const bookedMins = dayBookings.reduce((sum, b) => sum + (toMin(b.endTime) - toMin(b.startTime)), 0);
    return bookedMins < availableMins;
  };

  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const daySchedule = getDaySchedule(selectedDate);
    if (!daySchedule?.start || !daySchedule?.end) return [];

    const startMin = toMin(daySchedule.start);
    const endMin = toMin(daySchedule.end);
    const durationMin = Number(duration) * 60;
    const dayBookings = bookedSlots[toDateStr(selectedDate)] || [];

    const slots = [];
    for (let m = startMin; m < endMin; m += 30) {
      const slotEnd = m + durationMin;
      const overlapsBooked = dayBookings.some(
        (b) => toMin(b.startTime) < slotEnd && toMin(b.endTime) > m
      );
      const fitsWindow = slotEnd <= endMin;
      slots.push({ time: toHHMM(m), available: fitsWindow && !overlapsBooked });
    }
    return slots;
  }, [selectedDate, availability, bookedSlots, duration]);

  const selectedSlot = timeSlots.find((s) => s.time === selectedTime);
  const durationOverlapWarning = selectedTime && selectedSlot && !selectedSlot.available
    ? `This time slot with ${duration} hour${duration > 1 ? 's' : ''} duration overlaps an existing booking. Please choose a shorter duration or different time.`
    : '';

  const estimatedPrice = useMemo(() => {
    if (!pro || !selectedDate) return 0;
    if (type === 'short') {
      return getAppliedRate(toDateStr(selectedDate), pro) * Number(duration);
    }
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const cur = new Date(selectedDate);
      cur.setDate(cur.getDate() + i);
      if (recurringDays.includes(DAY_BY_INDEX[cur.getDay()])) {
        total += getAppliedRate(toDateStr(cur), pro) * Number(duration);
      }
    }
    if (total === 0) {
      total = getAppliedRate(toDateStr(selectedDate), pro) * Number(duration);
    }
    return total;
  }, [pro, selectedDate, type, duration, recurringDays]);

  const toggleDay = (day) => {
    setRecurringDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setSelectedTime('');
  };

  const dayClassName = (date) => {
    const dayBookings = bookedSlots[toDateStr(date)] || [];
    if (dayBookings.length === 0) return undefined;
    return isDateAvailable(date) ? 'day-partial' : undefined;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedDate || !selectedTime) {
      setError('Please select a date and time.');
      return;
    }
    if (durationOverlapWarning) {
      setError(durationOverlapWarning);
      return;
    }
    if (!address.trim() || !workDescription.trim()) {
      setError('Address and work description are required.');
      return;
    }
    if (type === 'long' && recurringDays.length === 0) {
      setError('Please select at least one day for a long-term booking.');
      return;
    }

    setSubmitState('submitting');
    try {
      const dateStr = toDateStr(selectedDate);

      const checkRes = await api.post('/api/bookings/check-availability', {
        professionalId: id,
        date: dateStr,
        time: selectedTime,
        duration,
      });

      if (!checkRes.data.available) {
        setError('That time is no longer available. Please choose another slot.');
        setSubmitState('idle');
        return;
      }

      const createRes = await api.post('/api/bookings/create', {
        professionalId: id,
        date: dateStr,
        time: selectedTime,
        type,
        recurringDays: type === 'long' ? recurringDays : [],
        duration,
        address,
        workDescription,
      });

      setConfirmation(createRes.data.bookingId);
      setSubmitState('success');
      setTimeout(() => {
        navigate('/my-bookings');
      }, 1500);
    } catch (err) {
      setSubmitState('error');
      setError(err.response?.data?.message || 'Booking failed. Please try again.');
      setTimeout(() => setSubmitState('idle'), 3000);
    }
  };

  if (loading) {
    return (
      <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div className="app-page-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!pro) {
    return (
      <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div className="app-page-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p className="text-muted">{error || 'Professional not found.'}</p>
            <Link to="/home" className="btn btn-secondary" style={{ marginTop: 16 }}>Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  if (confirmation) {
    return (
      <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div className="app-page-content" style={{ maxWidth: 480, margin: '0 auto', padding: '28px 20px' }}>
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <h2 style={{ color: '#16A34A', marginBottom: 12 }}>✓ Booking Submitted!</h2>
            <div className="msg-success" style={{ textAlign: 'left' }}>
              Your booking request has been sent to the professional. You will be notified when they respond.
            </div>
            <p className="text-muted" style={{ marginBottom: 8, marginTop: 12 }}>
              Booking ID: <strong>{confirmation}</strong>
            </p>
            <p className="text-muted" style={{ marginBottom: 20 }}>Redirecting to My Bookings...</p>
            <Link to="/my-bookings" className="btn btn-primary">View My Bookings</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div className="app-page-content" style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px' }}>
      <div className="booking-layout">
        <div className="card">
          <div style={{
            width: 88, height: 88, borderRadius: '50%', overflow: 'hidden',
            background: 'var(--primary-light)', margin: '0 auto 14px'
          }}>
            {pro.profilePhoto && (
              <img src={fileUrl(pro.profilePhoto)} alt={pro.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18 }}>{pro.name}</div>
          <div style={{ textAlign: 'center', marginTop: 6 }}>
            <span className="badge badge-blue">{pro.professionalType}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 8 }}>
            <Star size={14} className="star" fill="#f59e0b" strokeWidth={1.5} />
            <span className="text-muted">{pro.rating ? pro.rating.toFixed(1) : 'New'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8, color: 'var(--text-muted)', fontSize: 13 }}>
            <MapPin size={13} /> {formatLocation(pro.location)}
          </div>

          <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div className="text-muted">Rate</div>
            <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 20 }}>
              {formatBDT(pro.weekdayRate || pro.hourlyRate)}/hr
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="text-muted">Available Days</div>
            <div style={{ marginTop: 4, fontWeight: 500 }}>{formatAvailability(pro.availability)}</div>
          </div>
        </div>

        <div>
          <div className="card">
            <h2 style={{ marginBottom: 20 }}>Book {pro.name}</h2>

            {error && (
              <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '10px 14px' }}>{error}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Date</label>
                <DatePicker
                  selected={selectedDate}
                  onChange={handleSelectDate}
                  filterDate={isDateAvailable}
                  dayClassName={dayClassName}
                  minDate={new Date()}
                  placeholderText="Select a date"
                  dateFormat="yyyy-MM-dd"
                />
                <p className="text-muted" style={{ marginTop: 6 }}>
                  Greyed-out dates are unavailable or fully booked. Dates with an orange dot are partially booked.
                </p>
              </div>

              {selectedDate && (
                <div className="form-group">
                  <label>Available Time Slots</label>
                  {timeSlots.length === 0 ? (
                    <p className="text-muted">No available time slots on this date.</p>
                  ) : (
                    <div className="time-slot-grid">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          className={`time-slot ${selectedTime === slot.time ? 'selected' : ''}`}
                          onClick={() => setSelectedTime(slot.time)}
                          style={!slot.available ? { textDecoration: 'line-through' } : undefined}
                        >
                          {slot.time}{!slot.available && ' (booked)'}
                        </button>
                      ))}
                    </div>
                  )}
                  {durationOverlapWarning && (
                    <div className="msg-error" style={{ marginTop: 10 }}>{durationOverlapWarning}</div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Duration</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5, 6].map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={`btn ${duration === h ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: '1 1 60px' }}
                      onClick={() => setDuration(h)}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Booking Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className={`btn ${type === 'short' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setType('short')}
                  >
                    Short
                  </button>
                  <button
                    type="button"
                    className={`btn ${type === 'long' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setType('long')}
                  >
                    Long
                  </button>
                </div>
              </div>

              {type === 'long' && (
                <div className="form-group">
                  <label>Repeat On</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {DAYS.map((day) => (
                      <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                        <input
                          type="checkbox"
                          style={{ width: 'auto' }}
                          checked={recurringDays.includes(day)}
                          onChange={() => toggleDay(day)}
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Address</label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Your full address in Bangladesh"
                  required
                />
              </div>

              <div className="form-group">
                <label>Work Description</label>
                <textarea
                  rows={3}
                  value={workDescription}
                  onChange={(e) => setWorkDescription(e.target.value)}
                  placeholder="Describe the work needed"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '1px solid var(--border)' }}>
                <span className="text-muted">Total</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{formatBDT(estimatedPrice)}</span>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={submitState === 'submitting' || submitState === 'success' || !!durationOverlapWarning}
                style={{
                  marginTop: 8,
                  background: submitState === 'success' ? '#22C55E' : undefined,
                }}
              >
                {submitState === 'idle' && 'Submit Booking Request'}
                {submitState === 'submitting' && '⏳ Submitting...'}
                {submitState === 'success' && '✓ Booking Submitted!'}
                {submitState === 'error' && 'Try Again'}
              </button>
            </form>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
