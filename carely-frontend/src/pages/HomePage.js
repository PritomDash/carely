import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { API_BASE } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import LocationSelector from '../components/LocationSelector';
import socket from '../socket';
import {
  Bell, Search, MapPin, Clock, Star,
} from 'lucide-react';

const PROFESSIONAL_TYPES = ['Child Care', 'Aged Care', 'Nurse', 'Physiotherapist'];
const TYPE_COLORS = {
  'Child Care': { bg: '#EBF5FF', text: '#1A56DB' },
  'Aged Care': { bg: '#F3E8FF', text: '#7E22CE' },
  'Nurse': { bg: '#DCFCE7', text: '#15803D' },
  'Physiotherapist': { bg: '#FFF7ED', text: '#C2410C' },
};

const CUSTOMER_LINKS = [
  { emoji: '📋', label: 'My Bookings', to: '/my-bookings' },
  { emoji: '📝', label: 'Post a Job', to: '/create-job-post' },
  { emoji: '📌', label: 'My Job Posts', to: '/my-posts' },
  { emoji: '💬', label: 'Chat Inbox', to: '/chat-inbox' },
  { emoji: '👤', label: 'Edit Profile', to: '/edit-profile' },
];

const PROFESSIONAL_LINKS = [
  { emoji: '📋', label: 'My Bookings', to: '/my-bookings' },
  { emoji: '✏️', label: 'Edit Profile', to: '/edit-profile' },
  { emoji: '📄', label: 'Documents', to: '/upload-documents' },
  { emoji: '💰', label: 'Earnings', to: '/earnings' },
  { emoji: '💳', label: 'My Credits', to: '/my-credits' },
  { emoji: '📢', label: 'Job Posts', to: '/job-posts' },
  { emoji: '💬', label: 'Chat Inbox', to: '/chat-inbox' },
];

const ADMIN_LINKS = [
  { emoji: '🛡️', label: 'Admin Dashboard', to: '/admin' },
];

const fileUrl = (p) => {
  if (!p) return null;
  const name = String(p).split(/[\\/]/).pop();
  return `${API_BASE}/uploads/documents/${name}`;
};

const formatLocation = (loc) => {
  if (!loc) return 'Location not set';
  return [loc.thana, loc.district].filter(Boolean).join(', ') || 'Location not set';
};

const getInitials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const Avatar = ({ src, name, size = 64 }) => (
  <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.35 }}>
    {src ? <img src={src} alt={name} /> : <span>{getInitials(name)}</span>}
  </div>
);

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

function ProfileDropdown({ user, role, onLogout, onClose }) {
  const links = role === 'professional' ? PROFESSIONAL_LINKS : role === 'admin' ? ADMIN_LINKS : CUSTOMER_LINKS;

  return (
    <div className="profile-dropdown">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '8px 8px 12px' }}>
        <Avatar name={user?.name} size={48} />
        <div style={{ fontWeight: 700, marginTop: 8 }}>{user?.name}</div>
        <span className="badge badge-blue" style={{ marginTop: 6, textTransform: 'capitalize' }}>{role}</span>
      </div>
      <div style={{ borderTop: '1px solid #E2E8F0', margin: '4px 0' }} />
      {links.map((l) => (
        <Link key={l.label} to={l.to} className="dropdown-item" onClick={onClose}>
          <span>{l.emoji}</span> {l.label}
        </Link>
      ))}
      <div style={{ borderTop: '1px solid #E2E8F0', margin: '4px 0' }} />
      <button
        className="dropdown-item dropdown-item-danger"
        onClick={() => { onClose(); onLogout(); }}
      >
        <span>🚪</span> Logout
      </button>
    </div>
  );
}

function Navbar({ user, role, unreadCount, onLogout }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="navbar">
      <Link to="/home" className="navbar-brand">
        <span className="heart">💙</span> Carely
      </Link>
      <div className="navbar-links">
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
        <span style={{ fontWeight: 600, fontSize: 14 }}>{user?.name}</span>
        <div ref={wrapperRef} style={{ position: 'relative' }}>
          <div onClick={() => setOpen((o) => !o)} style={{ cursor: 'pointer' }}>
            <Avatar name={user?.name} size={36} />
          </div>
          {open && (
            <ProfileDropdown user={user} role={role} onLogout={onLogout} onClose={() => setOpen(false)} />
          )}
        </div>
      </div>
    </div>
  );
}

function ProfessionalsSearch() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState({});
  const [serviceType, setServiceType] = useState('');
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);

  const runSearch = useCallback(() => {
    setLoading(true);
    const params = {};
    if (location.division) params.division = location.division;
    if (location.district) params.district = location.district;
    if (location.thana) params.thana = location.thana;
    if (serviceType) params.serviceType = serviceType;
    if (keyword.trim()) params.search = keyword.trim();

    api.get('/api/users/professionals', { params })
      .then((res) => setProfessionals(res.data || []))
      .catch(() => setProfessionals([]))
      .finally(() => setLoading(false));
  }, [location, serviceType, keyword]);

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    runSearch();
  };

  return (
    <div>
      <form className="search-bar" onSubmit={handleSubmit}>
        <input
          className="search-input"
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search by name..."
        />
        <LocationSelector value={location} onChange={setLocation} />
        <select className="search-select" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
          <option value="">All Types</option>
          {PROFESSIONAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button type="submit" className="btn-primary">
          <Search size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Search
        </button>
      </form>

      {loading ? (
        <p className="text-muted">Loading professionals...</p>
      ) : professionals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="text-muted">No professionals found. Try a different search or location.</p>
        </div>
      ) : (
        <div className="pros-grid">
          {professionals.map((p) => {
            const typeColor = TYPE_COLORS[p.professionalType] || { bg: '#F1F5F9', text: '#475569' };
            return (
              <div key={p._id} className="pro-card">
                <div className="pro-card-header">
                  {p.profilePhoto ? (
                    <img className="pro-avatar" src={fileUrl(p.profilePhoto)} alt={p.name} />
                  ) : (
                    <div className="pro-avatar">{getInitials(p.name)}</div>
                  )}
                  <div>
                    <div className="pro-name">{p.name}</div>
                    <div className="pro-meta">
                      <MapPin size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      {formatLocation(p.location)}
                    </div>
                  </div>
                  {p.isVerified && <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>Verified</span>}
                </div>

                <div>
                  <span className="badge" style={{ background: typeColor.bg, color: typeColor.text }}>
                    {p.professionalType}
                  </span>
                </div>

                <div className="pro-meta">
                  <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {p.experience || 'Experience not specified'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Stars rating={p.rating} />
                  <span className="pro-meta">({p.ratings?.length || 0} reviews)</span>
                </div>

                <div style={{ fontWeight: 800, color: '#2B7FFF', fontSize: 16 }}>
                  {formatBDT(p.weekdayRate || p.hourlyRate)}/hr
                </div>

                <div className="pro-card-buttons">
                  <button className="btn-primary" onClick={() => navigate(`/view-profile/${p._id}`)}>View Profile</button>
                  <button className="btn-primary" onClick={() => navigate(`/book/${p._id}`)}>Book</button>
                  <button className="btn-gray" onClick={() => navigate(`/chat/${p._id}`)}>Chat</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { user: contextUser, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const storedUser = localStorage.getItem('carelyUser');
  const localUser = storedUser ? JSON.parse(storedUser) : null;
  const user = contextUser || localUser;
  const role = contextUser?.role || localUser?.role || null;

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const refreshUnreadCount = useCallback(() => {
    api.get('/api/notifications/count-unread')
      .then((res) => setUnreadCount(res.data?.unreadCount || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshUnreadCount();
  }, [user, refreshUnreadCount]);

  useEffect(() => {
    if (!user?._id) return;
    socket.emit('joinRoom', user._id);
    socket.on('newNotification', refreshUnreadCount);
    return () => socket.off('newNotification', refreshUnreadCount);
  }, [user, refreshUnreadCount]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div>
      <Navbar user={user} role={role} unreadCount={unreadCount} onLogout={handleLogout} />
      <div className="page">
        <ProfessionalsSearch />
      </div>
    </div>
  );
}
