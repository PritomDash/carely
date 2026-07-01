import React, { useState, useEffect, useCallback } from 'react';
import api, { API_BASE } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import LocationSelector from '../components/LocationSelector';
import {
  Heart, Bell, LogOut, Search, MapPin, Clock, Star,
  ClipboardList, FileText, Bookmark, MessageSquare, User,
  Edit, Wallet, CreditCard, Briefcase,
} from 'lucide-react';

const PROFESSIONAL_TYPES = ['Child Care', 'Aged Care', 'Nurse', 'Physiotherapist'];
const TYPE_COLORS = {
  'Child Care': { bg: '#DBEAFE', text: '#1E40AF' },
  'Aged Care': { bg: '#EDE9FE', text: '#6D28D9' },
  'Nurse': { bg: '#DCFCE7', text: '#16A34A' },
  'Physiotherapist': { bg: '#FFEDD5', text: '#D97706' },
};

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

function Navbar({ unreadCount }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="nav" style={{ borderBottom: '2px solid #EFF6FF' }}>
      <div className="nav-inner">
        <Link to="/home" className="nav-logo">
          <Heart size={22} color="#1E40AF" fill="#1E40AF" /> Carely
        </Link>
        <div className="nav-links">
          <Link to="/chat-inbox" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Bell size={20} color="#334155" />
            {unreadCount > 0 && (
              <span className="badge badge-red" style={{
                position: 'absolute', top: -8, right: -10, borderRadius: '999px',
                padding: '0 6px', fontSize: 11, lineHeight: '16px'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <span style={{ fontWeight: 600, color: '#334155', fontSize: 14 }}>{user?.name}</span>
          <Avatar name={user?.name} size={36} />
          <button
            onClick={handleLogout}
            className="btn btn-outline"
            style={{ padding: '8px 16px', borderColor: '#DC2626', color: '#DC2626' }}
          >
            <LogOut size={14} /> Logout
          </button>
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
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 16 }}>Find Care Professionals Near You</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by name..."
              style={{ fontSize: 15, padding: 14 }}
            />
          </div>

          <div className="form-group">
            <LocationSelector value={location} onChange={setLocation} />
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                <option value="">All Types</option>
                {PROFESSIONAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              <Search size={16} /> Search
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <p className="text-muted">Loading professionals...</p>
      ) : professionals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="text-muted">No professionals found. Try a different search or location.</p>
        </div>
      ) : (
        <div className="grid-3">
          {professionals.map((p) => {
            const typeColor = TYPE_COLORS[p.professionalType] || { bg: '#F1F5F9', text: '#475569' };
            return (
              <div key={p._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Avatar src={fileUrl(p.profilePhoto)} name={p.name} size={80} />
                  {p.isVerified && <span className="badge badge-blue">Verified</span>}
                </div>

                <div style={{ marginTop: 12 }}>
                  <span className="badge" style={{ background: typeColor.bg, color: typeColor.text }}>
                    {p.professionalType}
                  </span>
                </div>

                <div style={{ fontWeight: 700, fontSize: 17, marginTop: 8 }}>{p.name}</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: '#64748B', fontSize: 13 }}>
                  <MapPin size={13} /> {formatLocation(p.location)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: '#64748B', fontSize: 13 }}>
                  <Clock size={13} /> {p.experience || 'Experience not specified'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Stars rating={p.rating} />
                  <span className="text-muted">({p.ratings?.length || 0} reviews)</span>
                </div>

                <div style={{ fontWeight: 800, color: '#1E40AF', marginTop: 8, fontSize: 16 }}>
                  {formatBDT(p.weekdayRate || p.hourlyRate)}/hr
                </div>

                <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-outline" style={{ flex: '1 1 90px' }} onClick={() => navigate(`/view-profile/${p._id}`)}>
                    View Profile
                  </button>
                  <button className="btn btn-primary" style={{ flex: '1 1 80px' }} onClick={() => navigate(`/book/${p._id}`)}>
                    Book
                  </button>
                  <button className="btn btn-secondary" style={{ flex: '1 1 70px' }} onClick={() => navigate(`/chat/${p._id}`)}>
                    Chat
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  const { user } = useAuth();
  const isProfessional = user.role === 'professional';

  const customerLinks = [
    { icon: ClipboardList, label: 'My Bookings', to: '/my-bookings' },
    { icon: FileText, label: 'Post a Job', to: '/create-job-post' },
    { icon: Bookmark, label: 'My Job Posts', to: '/my-posts' },
    { icon: MessageSquare, label: 'Chat Inbox', to: '/chat-inbox' },
    { icon: User, label: 'My Profile', to: '/edit-profile' },
  ];

  const professionalLinks = [
    { icon: ClipboardList, label: 'My Bookings', to: '/my-bookings' },
    { icon: Edit, label: 'Edit Profile', to: '/edit-profile' },
    { icon: FileText, label: 'Documents', to: '/upload-documents' },
    { icon: Wallet, label: 'Earnings', to: '/earnings' },
    { icon: CreditCard, label: 'My Credits', to: '/my-credits' },
    { icon: Briefcase, label: 'Job Posts', to: '/job-posts' },
    { icon: MessageSquare, label: 'Chat Inbox', to: '/chat-inbox' },
  ];

  const links = isProfessional ? professionalLinks : customerLinks;

  return (
    <div className="card">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
        <Avatar name={user.name} size={64} />
        <div style={{ fontWeight: 700, marginTop: 10, fontSize: 16 }}>{user.name}</div>
        <span className="badge badge-blue" style={{ marginTop: 6, textTransform: 'capitalize' }}>{user.role}</span>
      </div>

      <h3 style={{ marginBottom: 12, fontSize: 15 }}>{isProfessional ? 'Professional Menu' : 'Customer Menu'}</h3>
      <div className="sidebar-btn-list">
        {links.map((l) => (
          <Link key={l.label} to={l.to} className="btn btn-primary btn-block" style={{ justifyContent: 'flex-start', gap: 10 }}>
            <l.icon size={16} /> {l.label}
          </Link>
        ))}
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

  return (
    <div>
      <Navbar unreadCount={unreadCount} />
      <div className="page">
        <div className="dashboard-layout">
          <div><ProfessionalsSearch /></div>
          <div><Sidebar /></div>
        </div>
      </div>
    </div>
  );
}
