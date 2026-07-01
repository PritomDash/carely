import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import LocationSelector from '../components/LocationSelector';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const emptyAvailability = () =>
  DAYS.reduce((acc, day) => ({ ...acc, [day]: { start: '', end: '' } }), {});

export default function EditProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hourlyRate, setHourlyRate] = useState(0);

  const [form, setForm] = useState({
    name: '',
    experience: '',
    about: '',
    location: {},
    availability: emptyAvailability(),
    weekdayRate: '',
    saturdayRate: '',
    sundayRate: '',
    bkashNumber: '',
    nagadNumber: '',
    payoutMethod: '',
  });

  useEffect(() => {
    api.get('/api/users/me').then((res) => {
      const u = res.data;
      setHourlyRate(u.hourlyRate || 0);
      setForm({
        name: u.name || '',
        experience: u.experience || '',
        about: u.about || '',
        location: u.location || {},
        availability: { ...emptyAvailability(), ...(u.availability || {}) },
        weekdayRate: u.weekdayRate || '',
        saturdayRate: u.saturdayRate || '',
        sundayRate: u.sundayRate || '',
        bkashNumber: u.bkashNumber || '',
        nagadNumber: u.nagadNumber || '',
        payoutMethod: u.payoutMethod || '',
      });
    }).catch(() => setError('Failed to load profile')).finally(() => setLoading(false));
  }, []);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const setAvailability = (day, part, value) => {
    setForm((f) => ({
      ...f,
      availability: { ...f.availability, [day]: { ...f.availability[day], [part]: value } },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.put('/api/users/update-profile', {
        name: form.name,
        experience: form.experience,
        about: form.about,
        location: form.location,
        availability: form.availability,
        weekdayRate: form.weekdayRate,
        saturdayRate: form.saturdayRate,
        sundayRate: form.sundayRate,
        hourlyRate,
        bkashNumber: form.bkashNumber,
        nagadNumber: form.nagadNumber,
        payoutMethod: form.payoutMethod || null,
      });
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page"><p className="text-muted">Loading profile...</p></div>;
  }

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="card">
        <h2 style={{ marginBottom: 20 }}>Edit Profile</h2>

        {error && (
          <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>
        )}
        {success && (
          <div className="badge badge-green" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{success}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Experience</label>
            <input
              type="text"
              value={form.experience}
              onChange={(e) => setField('experience', e.target.value)}
              placeholder="e.g. 5 years"
            />
          </div>

          <div className="form-group">
            <label>About</label>
            <textarea
              rows={4}
              value={form.about}
              onChange={(e) => setField('about', e.target.value)}
              placeholder="Tell customers about yourself"
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <LocationSelector value={form.location} onChange={(loc) => setField('location', loc)} />
          </div>

          <div className="form-group">
            <label>Availability</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DAYS.map((day) => (
                <div key={day} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <span style={{ width: 90, flexShrink: 0 }}>{day}</span>
                  <input
                    type="time"
                    style={{ flex: '1 1 110px', minWidth: 0 }}
                    value={form.availability[day]?.start || ''}
                    onChange={(e) => setAvailability(day, 'start', e.target.value)}
                  />
                  <input
                    type="time"
                    style={{ flex: '1 1 110px', minWidth: 0 }}
                    value={form.availability[day]?.end || ''}
                    onChange={(e) => setAvailability(day, 'end', e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label>Weekday Rate (BDT/hr)</label>
              <input
                type="number"
                min="0"
                value={form.weekdayRate}
                onChange={(e) => setField('weekdayRate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Saturday Rate (BDT/hr)</label>
              <input
                type="number"
                min="0"
                value={form.saturdayRate}
                onChange={(e) => setField('saturdayRate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Sunday Rate (BDT/hr)</label>
              <input
                type="number"
                min="0"
                value={form.sundayRate}
                onChange={(e) => setField('sundayRate', e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>bKash Number</label>
              <input
                type="text"
                value={form.bkashNumber}
                onChange={(e) => setField('bkashNumber', e.target.value)}
                placeholder="01XXXXXXXXX"
              />
            </div>
            <div className="form-group">
              <label>Nagad Number</label>
              <input
                type="text"
                value={form.nagadNumber}
                onChange={(e) => setField('nagadNumber', e.target.value)}
                placeholder="01XXXXXXXXX"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Payout Method</label>
            <select value={form.payoutMethod} onChange={(e) => setField('payoutMethod', e.target.value)}>
              <option value="">Not set</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="bank">Bank</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', marginTop: 8 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/professional-profile" className="text-muted">Back to profile</Link>
        </div>
      </div>
    </div>
  );
}
