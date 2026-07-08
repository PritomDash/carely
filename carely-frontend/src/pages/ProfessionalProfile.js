import React, { useState, useEffect } from 'react';
import api, { API_BASE } from '../services/api';
import { Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import { Star } from 'lucide-react';
import AppNavbar from '../components/AppNavbar';

const fileUrl = (p) => {
  if (!p) return null;
  const name = String(p).split(/[\\/]/).pop();
  return `${API_BASE}/uploads/documents/${name}`;
};

const formatLocation = (loc) => {
  if (!loc) return 'Location not set';
  return [loc.thana, loc.district, loc.division].filter(Boolean).join(', ') || 'Location not set';
};

const Stars = ({ rating = 0 }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={16}
        className="star"
        fill={n <= Math.round(rating) ? '#f59e0b' : 'none'}
        strokeWidth={1.5}
      />
    ))}
    <span className="text-muted" style={{ marginLeft: 4 }}>{rating ? rating.toFixed(1) : 'New'}</span>
  </span>
);

export default function ProfessionalProfile() {
  const [profile, setProfile] = useState(null);
  const [creditsEnabled, setCreditsEnabled] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/users/me'),
      api.get('/api/admin/settings').catch(() => ({ data: {} })),
      api.get('/api/bookings/my-bookings').catch(() => ({ data: [] })),
    ]).then(([meRes, settingsRes, bookingsRes]) => {
      setProfile(meRes.data);
      setCreditsEnabled(!!settingsRes.data?.creditsEnabled);
      setCompletedCount((bookingsRes.data || []).filter((b) => b.status === 'Completed').length);
    }).finally(() => setLoading(false));
  }, []);

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

  if (!profile) {
    return (
      <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div className="app-page-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <p className="text-muted">Failed to load profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div className="app-page-content" style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px' }}>
      <div className="card">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%', overflow: 'hidden',
            background: '#f3f4f6', flexShrink: 0
          }}>
            {profile.profilePhoto && (
              <img src={fileUrl(profile.profilePhoto)} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <h2>{profile.name}</h2>
            <Stars rating={profile.rating} />
            <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-blue">{profile.professionalType}</span>
              {profile.isFeatured && <span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>⭐ Featured</span>}
            </div>
            <p className="text-muted" style={{ marginTop: 6 }}>{formatLocation(profile.location)}</p>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="text-muted">Completed Bookings</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{completedCount}</div>
        </div>
        <div className="card">
          <div className="text-muted">Average Rating</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{profile.rating ? profile.rating.toFixed(1) : 'New'}</div>
        </div>
      </div>

      {creditsEnabled && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="text-muted">Credit Balance</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>{profile.credits ?? 0}</div>
          <Link to="/my-credits" className="btn btn-primary" style={{ marginTop: 10 }}>Manage Credits</Link>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Quick Links</h3>
        <div className="sidebar-btn-list">
          <Link to="/edit-profile" className="btn btn-primary btn-block">Edit Profile</Link>
          <Link to="/my-bookings" className="btn btn-primary btn-block">My Bookings</Link>
          <Link to="/earnings" className="btn btn-primary btn-block">Earnings</Link>
          <Link to="/earnings" className="btn btn-primary btn-block">Payout Details</Link>
          <Link to="/upload-documents" className="btn btn-primary btn-block">Upload Documents</Link>
        </div>
      </div>
      </div>
    </div>
  );
}
