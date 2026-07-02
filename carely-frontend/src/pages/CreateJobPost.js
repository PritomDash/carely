import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import LocationSelector from '../components/LocationSelector';
import AppNavbar from '../components/AppNavbar';

const PROFESSIONAL_TYPES = ['Child Care', 'Aged Care', 'Nurse', 'Physiotherapist'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function CreateJobPost() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [emergencyEnabled, setEmergencyEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [location, setLocation] = useState({});
  const [startDate, setStartDate] = useState('');
  const [preferredDays, setPreferredDays] = useState([]);
  const [preferredTime, setPreferredTime] = useState('');
  const [bookingType, setBookingType] = useState('short');
  const [budgetBDT, setBudgetBDT] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'customer') {
      navigate('/home');
      return;
    }
    api.get('/api/admin/settings')
      .then((res) => setEmergencyEnabled(!!res.data?.emergencyPostEnabled))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const toggleDay = (day) => {
    setPreferredDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!location.division || !location.district || !location.thana) {
      setError('Please select a full location.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/jobs', {
        title,
        description,
        serviceType,
        location,
        schedule: {
          startDate: startDate || undefined,
          preferredDays,
          preferredTime,
        },
        bookingType,
        budgetBDT: budgetBDT ? Number(budgetBDT) : undefined,
        isEmergency: emergencyEnabled ? isEmergency : false,
      });
      navigate('/my-posts');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create job post.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.role !== 'customer') return null;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px' }}>
      <div className="card">
        <h2 style={{ marginBottom: 20 }}>Post a Job</h2>

        {error && (
          <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Need a nurse for elderly care" required />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what you need" required />
          </div>

          <div className="form-group">
            <label>Service Type</label>
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} required>
              <option value="">Select a type</option>
              {PROFESSIONAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Location</label>
            <LocationSelector value={location} onChange={setLocation} required />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Preferred Time</label>
              <input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Preferred Days</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {DAYS.map((day) => (
                <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={preferredDays.includes(day)}
                    onChange={() => toggleDay(day)}
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Booking Type</label>
              <select value={bookingType} onChange={(e) => setBookingType(e.target.value)}>
                <option value="short">Short-term</option>
                <option value="long">Long-term</option>
              </select>
            </div>
            <div className="form-group">
              <label>Budget (BDT, optional)</label>
              <input type="number" min="0" value={budgetBDT} onChange={(e) => setBudgetBDT(e.target.value)} placeholder="e.g. 5000" />
            </div>
          </div>

          {emergencyEnabled && (
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="isEmergency"
                style={{ width: 'auto' }}
                checked={isEmergency}
                onChange={(e) => setIsEmergency(e.target.checked)}
              />
              <label htmlFor="isEmergency" style={{ margin: 0 }}>Mark as Emergency / Urgent</label>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', marginTop: 8 }}>
            {submitting ? 'Posting...' : 'Post Job'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: 16 }}>
        <Link to="/home" className="text-muted">Back to Home</Link>
      </div>
      </div>
    </div>
  );
}
