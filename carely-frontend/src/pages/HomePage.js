import React, { useState, useEffect, useCallback } from 'react';
import api, { API_BASE } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import LocationSelector from '../components/LocationSelector';
import { Heart, Bell, Star, LogOut, Search } from 'lucide-react';

const PROFESSIONAL_TYPES = ['Child Care', 'Aged Care', 'Nurse', 'Physiotherapist'];
const DAY_ABBR = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };

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

const Avatar = ({ src, alt, size = 64 }) => (
  <div className="avatar" style={{ width: size, height: size }}>
    {src ? <img src={src} alt={alt} /> : <span className="avatar-fallback">No Photo</span>}
  </div>
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
        <Link to="/home" className="nav-logo">
          <Heart size={20} color="#2563EB" fill="#2563EB" /> Carely
        </Link>
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

function ProfessionalDashboardMain() {
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
  );
}

function CustomerSearchMain() {
  const navigate = useNavigate();
  const [location, setLocation] = useState({});
  const [serviceType, setServiceType] = useState('');
  const [keyword, setKeyword] = useState('');
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);

  const runSearch = useCallback((overrides = {}) => {
    setLoading(true);
    const loc = overrides.location ?? location;
    const st = 'serviceType' in overrides ? overrides.serviceType : serviceType;
    const kw = overrides.keyword ?? keyword;

    const params = {};
    if (loc.division) params.division = loc.division;
    if (loc.district) params.district = loc.district;
    if (loc.thana) params.thana = loc.thana;
    if (st) params.serviceType = st;
    if (kw.trim()) params.search = kw.trim();

    api.get('/api/users/professionals', { params })
      .then((res) => setProfessionals(res.data || []))
      .catch(() => setProfessionals([]))
      .finally(() => setLoading(false));
  }, [location, serviceType, keyword]);

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line
  }, []);

  const handleLocationChange = (loc) => {
    setLocation(loc);
    runSearch({ location: loc });
  };

  const handleServiceTypeChange = (e) => {
    const st = e.target.value;
    setServiceType(st);
    runSearch({ serviceType: st });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    runSearch();
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search by name or keyword"
            style={{ flex: '2 1 200px', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' }}
          />
          <select
            value={serviceType}
            onChange={handleServiceTypeChange}
            style={{ flex: '1 1 160px', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
          >
            <option value="">All Types</option>
            {PROFESSIONAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button type="submit" className="btn btn-primary">
            <Search size={14} style={{ marginRight: 6 }} /> Search
          </button>
        </form>

        <LocationSelector value={location} onChange={handleLocationChange} />
      </div>

      {loading ? (
        <p className="text-muted">Loading professionals...</p>
      ) : professionals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="text-muted">No professionals found. Try a different search or location.</p>
        </div>
      ) : (
        <div className="grid-2">
          {professionals.map((p) => (
            <div key={p._id} className="card">
              <div style={{ display: 'flex', gap: 14 }}>
                <Avatar src={fileUrl(p.profilePhoto)} alt={p.name} size={64} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                  <Stars rating={p.rating} />
                  <div className="text-muted" style={{ marginTop: 4 }}>{p.experience || 'Experience not specified'}</div>
                  <div className="text-muted" style={{ marginTop: 2 }}>{formatLocation(p.location)}</div>
                </div>
              </div>

              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="badge badge-blue" style={{ width: 'fit-content' }}>{p.professionalType}</span>
                <div className="text-muted">Available: {formatAvailability(p.availability)}</div>
                <div style={{ fontWeight: 700, color: '#2563EB' }}>
                  {formatBDT(p.weekdayRate || p.hourlyRate)}/hr
                </div>
              </div>

              <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ flex: '1 1 100px' }} onClick={() => navigate(`/view-profile/${p._id}`)}>
                  View Profile
                </button>
                <button className="btn btn-primary" style={{ flex: '1 1 100px' }} onClick={() => navigate(`/book/${p._id}`)}>
                  Book
                </button>
                <button className="btn btn-primary" style={{ flex: '1 1 100px' }} onClick={() => navigate(`/chat/${p._id}`)}>
                  Chat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfessionalSidebar() {
  return (
    <div className="card">
      <h3 style={{ marginBottom: 14 }}>Professional Dashboard</h3>
      <div className="sidebar-btn-list">
        <Link to="/edit-profile" className="btn btn-primary btn-block">Edit My Profile</Link>
        <Link to="/my-bookings" className="btn btn-primary btn-block">View My Bookings</Link>
        <Link to="/earnings" className="btn btn-primary btn-block">View Earnings</Link>
        <Link to="/earnings" className="btn btn-primary btn-block">Payout Details</Link>
        <Link to="/upload-documents" className="btn btn-primary btn-block">Upload Documents</Link>
      </div>
    </div>
  );
}

function CustomerSidebar() {
  return (
    <div className="card">
      <h3 style={{ marginBottom: 14 }}>Customer Dashboard</h3>
      <div className="sidebar-btn-list">
        <Link to="/my-bookings" className="btn btn-primary btn-block">My Bookings</Link>
        <Link to="/create-job-post" className="btn btn-primary btn-block">Post a Job</Link>
        <Link to="/my-posts" className="btn btn-primary btn-block">My Job Posts</Link>
        <Link to="/chat-inbox" className="btn btn-primary btn-block">Chat Inbox</Link>
      </div>
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

  const isProfessional = user.role === 'professional';

  return (
    <div>
      <Navbar unreadCount={unreadCount} />
      <div className="page">
        <div className="dashboard-layout">
          <div>{isProfessional ? <ProfessionalDashboardMain /> : <CustomerSearchMain />}</div>
          <div>{isProfessional ? <ProfessionalSidebar /> : <CustomerSidebar />}</div>
        </div>
      </div>
    </div>
  );
}
