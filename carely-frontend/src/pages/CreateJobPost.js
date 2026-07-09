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
  const [emergencyCost, setEmergencyCost] = useState(3);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitState, setSubmitState] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState('');
  const [insufficientCredits, setInsufficientCredits] = useState(false);

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
    if (credits != null && credits < emergencyCost) setIsEmergency(false);
  }, [credits, emergencyCost]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'customer') {
      navigate('/home');
      return;
    }
    // Independent .catch() per request - a transient failure of one call
    // (e.g. the balance fetch) must not wipe out the other's successfully
    // fetched data. Promise.all would reject the whole thing on a single
    // failure, silently leaving emergencyEnabled at its false default even
    // when the setting is actually on.
    Promise.all([
      api.get('/api/admin/settings').catch(() => null),
      api.get('/api/credits/my-balance').catch(() => null),
    ]).then(([settingsRes, balanceRes]) => {
      if (settingsRes) {
        setEmergencyEnabled(!!settingsRes.data?.emergencyPostEnabled);
        setEmergencyCost(settingsRes.data?.emergencyPostCreditCost ?? 3);
      }
      if (balanceRes) setCredits(balanceRes.data?.credits ?? 0);
    }).finally(() => setLoading(false));
  }, [user, navigate]);

  const toggleDay = (day) => {
    setPreferredDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInsufficientCredits(false);

    if (!location.division || !location.district || !location.thana) {
      setError('Please select a full location.');
      return;
    }

    setSubmitState('submitting');
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
      setSubmitState('success');
      // Emergency posts deduct a credit - let the navbar balance refresh
      // instead of showing a stale pre-deduction number.
      if (isEmergency) window.dispatchEvent(new Event('carely-credits-changed'));
      setTimeout(() => navigate('/my-posts'), 1200);
    } catch (err) {
      setSubmitState('error');
      setError(err.response?.data?.message || 'Failed to create job post.');
      setInsufficientCredits(!!err.response?.data?.insufficientCredits);
      setTimeout(() => setSubmitState('idle'), 3000);
    }
  };

  if (!user || user.role !== 'customer') return null;

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

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div className="app-page-content" style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px' }}>
      <div className="card">
        <h2 style={{ marginBottom: 20 }}>Post a Job</h2>

        {error && (
          <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>
            {error}
            {insufficientCredits && (
              <> <Link to="/my-credits" style={{ fontWeight: 700, textDecoration: 'underline' }}>Buy Credits</Link></>
            )}
          </div>
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
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="isEmergency"
                  style={{ width: 'auto' }}
                  checked={isEmergency}
                  disabled={credits != null && credits < emergencyCost}
                  onChange={(e) => setIsEmergency(e.target.checked)}
                />
                <label htmlFor="isEmergency" style={{ margin: 0 }}>Emergency Post ({emergencyCost} credits)</label>
              </div>
              <p className="text-muted" style={{ fontSize: 13, marginTop: 6, marginLeft: 24 }}>
                Instantly alerts every matching professional in your area. Your post appears at the top of the feed with an URGENT badge. Use this when you need someone urgently.
              </p>

              {credits != null && credits < emergencyCost && (
                <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginTop: 8, fontSize: 13, color: '#92400E' }}>
                  Emergency posts cost {emergencyCost} credits. You have {credits} credit{credits === 1 ? '' : 's'}.{' '}
                  <Link to="/my-credits" style={{ fontWeight: 700, textDecoration: 'underline', color: '#92400E' }}>Buy Credits</Link> to post an emergency job.
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitState === 'submitting' || submitState === 'success'}
            style={{ width: '100%', marginTop: 8, background: submitState === 'success' ? '#22C55E' : undefined }}
          >
            {submitState === 'idle' && 'Post Job'}
            {submitState === 'submitting' && '⏳ Posting...'}
            {submitState === 'success' && '✓ Job Posted!'}
            {submitState === 'error' && 'Try Again'}
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
