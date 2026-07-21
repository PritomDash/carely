import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import { Star } from 'lucide-react';
import AppNavbar from '../components/AppNavbar';
import BoostStar from '../components/BoostStar';
import Avatar from '../components/Avatar';

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
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/users/me'),
      api.get('/api/bookings/my-bookings').catch(() => ({ data: [] })),
    ]).then(([meRes, bookingsRes]) => {
      setProfile(meRes.data);
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
          <Avatar user={profile} size={88} />
          <div style={{ minWidth: 0 }}>
            <h2>{profile.name}{profile.isFeatured && <BoostStar />}</h2>
            <Stars rating={profile.rating} />
            <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-blue">{profile.professionalType}</span>
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

      <div className="card" style={{ marginTop: 16, background: profile.isFeatured ? '#FFFBEB' : undefined, border: profile.isFeatured ? '1px solid #FDE68A' : undefined }}>
        {profile.isFeatured ? (
          <>
            <div style={{ fontWeight: 700, color: '#92400E' }}>⭐ Your Boost is active</div>
            <p className="text-muted" style={{ marginTop: 4, marginBottom: 10 }}>
              You're ranking first in search and getting job alerts 15 minutes early.
            </p>
            <Link to="/boost" className="btn btn-primary">Manage Boost</Link>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 700 }}>⭐ Get seen first</div>
            <p className="text-muted" style={{ marginTop: 4, marginBottom: 10 }}>
              Boost your profile to rank first in search, get job alerts 15 minutes early, and show a star badge. Carely never takes money from your earnings - Boost is optional.
            </p>
            <Link to="/boost" className="btn btn-primary">Boost Profile</Link>
          </>
        )}
      </div>

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
