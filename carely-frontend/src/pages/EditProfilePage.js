import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import LocationSelector from '../components/LocationSelector';
import AppNavbar from '../components/AppNavbar';
import ShareCard from '../components/ShareCard';
import Avatar from '../components/Avatar';
import { isValidPhone, PHONE_HINT } from '../utils/phoneValidation';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const emptyAvailability = () =>
  DAYS.reduce((acc, day) => ({ ...acc, [day]: { start: '', end: '' } }), {});

export default function EditProfilePage() {
  const [loading, setLoading] = useState(true);
  const [submitState, setSubmitState] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [role, setRole] = useState('customer');
  const [hourlyRate, setHourlyRate] = useState(0);
  const [profile, setProfile] = useState(null);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    professionalType: '',
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
      setRole(u.role);
      setHourlyRate(u.hourlyRate || 0);
      setProfile(u);
      setPhotoPreview(u.profilePhoto || null);
      setForm({
        name: u.name || '',
        phone: u.phone || '',
        professionalType: u.professionalType || '',
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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // Never blocks submit - only a gentle heads-up shown near the field. An
  // empty phone still can't be submitted, but that's the browser's native
  // `required` validation on the input itself, not this check.
  const phoneLooksOff = form.phone.trim().length > 0 && !isValidPhone(form.phone);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitState('submitting');
    try {
      if (photoFile) {
        const photoData = new FormData();
        photoData.append('profilePhoto', photoFile);
        await api.post('/api/users/documents', photoData);
      }

      if (role === 'professional') {
        await api.put('/api/users/update-profile', {
          name: form.name,
          phone: form.phone,
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
      } else {
        await api.put('/api/users/update-profile', {
          name: form.name,
          phone: form.phone,
        });
      }

      setPhotoFile(null);
      setSuccess('Profile updated successfully.');
      setSubmitState('success');
      setTimeout(() => setSubmitState('idle'), 2000);
    } catch (err) {
      setSubmitState('error');
      setError(err.response?.data?.message || 'Failed to update profile.');
      setTimeout(() => setSubmitState('idle'), 3000);
    }
  };

  if (loading) {
    return (
      <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div className="app-page-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <p className="text-muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div className="app-page-content" style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px' }}>
      <div className="card">
        <h2 className="page-title">Edit Profile</h2>

        {error && <div className="msg-error">{error}</div>}
        {success && <div className="msg-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          {role === 'professional' && (
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <div style={{ margin: '0 auto 12px', width: 'fit-content' }}>
                <Avatar name={form.name} photo={photoPreview} size={96} />
              </div>
              <label className="form-label" style={{ display: 'block', textAlign: 'center' }}>Profile Photo</label>
              <input type="file" accept="image/*" onChange={handlePhotoChange} />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Name</label>
            <input className="form-input" type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Phone</label>
            <input className="form-input" type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="01XXXXXXXXX" required />
            {phoneLooksOff && (
              <div style={{ fontSize: 12, color: '#B45309', marginTop: 6 }}>{PHONE_HINT}</div>
            )}
          </div>

          {role === 'professional' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Professional Type</label>
                <input className="form-input" type="text" value={form.professionalType} disabled style={{ background: '#F5F7FA', color: '#64748B' }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">About / Bio</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={form.about}
                  onChange={(e) => setField('about', e.target.value)}
                  placeholder="Tell customers about yourself"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Experience</label>
                <input
                  className="form-input"
                  type="text"
                  value={form.experience}
                  onChange={(e) => setField('experience', e.target.value)}
                  placeholder="e.g. 5 years"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Location</label>
                <LocationSelector value={form.location} onChange={(loc) => setField('location', loc)} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Availability</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {DAYS.map((day) => (
                    <div key={day} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <span style={{ width: 90, flexShrink: 0 }}>{day}</span>
                      <input
                        className="form-input"
                        type="time"
                        style={{ flex: '1 1 110px', minWidth: 0 }}
                        value={form.availability[day]?.start || ''}
                        onChange={(e) => setAvailability(day, 'start', e.target.value)}
                      />
                      <input
                        className="form-input"
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
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Weekday Rate (BDT/hr)</label>
                  <input className="form-input" type="number" min="0" value={form.weekdayRate} onChange={(e) => setField('weekdayRate', e.target.value)} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Saturday Rate (BDT/hr)</label>
                  <input className="form-input" type="number" min="0" value={form.saturdayRate} onChange={(e) => setField('saturdayRate', e.target.value)} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Sunday Rate (BDT/hr)</label>
                  <input className="form-input" type="number" min="0" value={form.sundayRate} onChange={(e) => setField('sundayRate', e.target.value)} />
                </div>
              </div>

              <div className="grid-2">
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">bKash Number</label>
                  <input className="form-input" type="text" value={form.bkashNumber} onChange={(e) => setField('bkashNumber', e.target.value)} placeholder="01XXXXXXXXX" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Nagad Number</label>
                  <input className="form-input" type="text" value={form.nagadNumber} onChange={(e) => setField('nagadNumber', e.target.value)} placeholder="01XXXXXXXXX" />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Payout Method</label>
                <select className="form-input" value={form.payoutMethod} onChange={(e) => setField('payoutMethod', e.target.value)}>
                  <option value="">Not set</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={submitState === 'submitting'}
            style={{ width: '100%', marginTop: 8, background: submitState === 'success' ? '#22C55E' : undefined }}
          >
            {submitState === 'idle' && 'Save Changes'}
            {submitState === 'submitting' && '⏳ Saving...'}
            {submitState === 'success' && '✓ Saved!'}
            {submitState === 'error' && 'Try Again'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/home" className="text-muted">Back to Home</Link>
        </div>
      </div>

      {role === 'professional' && profile && (
        <div style={{ marginTop: 20 }}>
          <ShareCard user={profile} />
        </div>
      )}
      </div>
    </div>
  );
}
