import React, { useState, useEffect } from 'react';
import api, { API_BASE } from '../services/api';
import { Link } from 'react-router-dom';
import LocationSelector from '../components/LocationSelector';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const emptyAvailability = () =>
  DAYS.reduce((acc, day) => ({ ...acc, [day]: { start: '', end: '' } }), {});

const fileUrl = (p) => {
  if (!p) return null;
  const name = String(p).split(/[\\/]/).pop();
  return `${API_BASE}/uploads/documents/${name}`;
};

export default function EditProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [role, setRole] = useState('customer');
  const [hourlyRate, setHourlyRate] = useState(0);

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
      setPhotoPreview(fileUrl(u.profilePhoto));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
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
        <h2 className="page-title">Edit Profile</h2>

        {error && <div className="msg-error">{error}</div>}
        {success && <div className="msg-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          {role === 'professional' && (
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <div style={{
                width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
                background: '#EBF3FF', margin: '0 auto 12px'
              }}>
                {photoPreview && (
                  <img src={photoPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
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

          <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%', marginTop: 8 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/home" className="text-muted">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
