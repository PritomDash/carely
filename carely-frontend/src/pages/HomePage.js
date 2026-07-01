import React, { useState, useEffect, useCallback } from 'react';
import api, { API_BASE } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import LocationSelector from '../components/LocationSelector';
import { Bell, Star, LogOut } from 'lucide-react';

const PROFESSIONAL_TYPES = ['Child Care', 'Aged Care', 'Nurse', 'Physiotherapist'];

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
        size={14}
        className="star"
        fill={n <= Math.round(rating) ? '#f59e0b' : 'none'}
        strokeWidth={1.5}
      />
    ))}
    <span className="text-muted" style={{ marginLeft: 4 }}>{rating ? rating.toFixed(1) : 'New'}</span>
  </span>
);

function Navbar({ unreadCount }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="nav">
      <div className="nav-inner">
        <Link to="/home" className="nav-logo">Carely</Link>
        <div className="nav-links">
          <Link to="/chat-inbox" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="badge badge-red" style={{
                position: 'absolute', top: -8, right: -10, borderRadius: '999px',
                padding: '0 6px', fontSize: 11, lineHeight: '16px'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <span className="text-muted">{user?.name}</span>
          <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '6px 12px' }}>
            <LogOut size={14} style={{ marginRight: 6 }} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfessionalDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/bookings/my-bookings')
      .then((res) => setBookings(res.data || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = bookings
    .filter((b) => b.status === 'Confirmed')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  return (
    <div className="page">
      <h2 style={{ marginBottom: 16 }}>Your Dashboard</h2>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <Link to="/edit-profile" className="card" style={{ textAlign: 'center' }}>Edit Profile</Link>
        <Link to="/upload-documents" className="card" style={{ textAlign: 'center' }}>Upload Documents</Link>
        <Link to="/my-bookings" className="card" style={{ textAlign: 'center' }}>My Bookings</Link>
        <Link to="/earnings" className="card" style={{ textAlign: 'center' }}>Earnings</Link>
        <Link to="/my-credits" className="card" style={{ textAlign: 'center' }}>My Credits</Link>
        <Link to="/professional-profile" className="card" style={{ textAlign: 'center' }}>My Profile</Link>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Upcoming Bookings</h3>
        {loading ? (
          <p className="text-muted">Loading...</p>
        ) : upcoming.length === 0 ? (
          <p className="text-muted">No upcoming bookings.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcoming.map((b) => (
              <div key={b._id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid #f3f4f6', paddingBottom: 10
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{b.customer?.name}</div>
                  <div className="text-muted">{b.date?.slice(0, 10)} at {b.time}</div>
                </div>
                <span className="badge badge-green">{formatBDT(b.proNet ?? b.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CustomerSearch() {
  const navigate = useNavigate();
  const [location, setLocation] = useState({});
  const [serviceType, setServiceType] = useState('');
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProfessionals = useCallback(() => {
    setLoading(true);
    const params = {};
    if (location.division) params.division = location.division;
    if (location.district) params.district = location.district;
    if (location.thana) params.thana = location.thana;
    if (serviceType) params.serviceType = serviceType;

    api.get('/api/users/professionals', { params })
      .then((res) => setProfessionals(res.data || []))
      .catch(() => setProfessionals([]))
      .finally(() => setLoading(false));
  }, [location.division, location.district, location.thana, serviceType]);

  useEffect(() => { fetchProfessionals(); }, [fetchProfessionals]);

  return (
    <div className="page">
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h2>Find a Professional</h2>
          <Link to="/create-job-post" className="btn btn-primary">Post a Job</Link>
        </div>

        <LocationSelector value={location} onChange={setLocation} />

        <div className="form-group" style={{ marginTop: 12 }}>
          <label>Professional Type</label>
          <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
            <option value="">All Types</option>
            {PROFESSIONAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-muted">Loading professionals...</p>
      ) : professionals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="text-muted">No professionals found. Try a different location or type.</p>
        </div>
      ) : (
        <div className="grid-3">
          {professionals.map((p) => (
            <div
              key={p._id}
              className="card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/view-profile/${p._id}`)}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
                  background: '#f3f4f6', flexShrink: 0
                }}>
                  {p.profilePhoto && (
                    <img src={fileUrl(p.profilePhoto)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <Stars rating={p.rating} />
                </div>
              </div>

              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="badge badge-blue" style={{ width: 'fit-content' }}>{p.professionalType}</span>
                <span className="text-muted">{formatLocation(p.location)}</span>
                <span style={{ fontWeight: 600, color: '#16a34a' }}>
                  {formatBDT(p.weekdayRate || p.hourlyRate)}/hr
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    api.get('/api/notifications/count-unread')
      .then((res) => setUnreadCount(res.data?.unreadCount || 0))
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  return (
    <div>
      <Navbar unreadCount={unreadCount} />
      {user.role === 'professional' ? <ProfessionalDashboard /> : <CustomerSearch />}
    </div>
  );
}
