import React, { useState, useEffect, useCallback } from 'react';
import api, { API_BASE } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import LocationSelector from '../components/LocationSelector';
import AppNavbar from '../components/AppNavbar';
import AppFooter from '../components/AppFooter';
import socket from '../socket';
import { Search, MapPin, Clock, Star } from 'lucide-react';

const PROFESSIONAL_TYPES = ['Child Care', 'Aged Care', 'Nurse', 'Physiotherapist'];
const TYPE_COLORS = {
  'Child Care': { bg: '#EBF5FF', text: '#1A56DB' },
  'Aged Care': { bg: '#F3E8FF', text: '#7E22CE' },
  'Nurse': { bg: '#DCFCE7', text: '#15803D' },
  'Physiotherapist': { bg: '#FFF7ED', text: '#C2410C' },
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

function Leaderboard() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    api.get('/api/users/leaderboard')
      .then((res) => setLeaders(res.data || []))
      .catch(() => setLeaders([]));
  }, []);

  if (leaders.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#1A1A2E' }}>
        🏆 Top Professionals This Month
      </h3>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {leaders.map((p, i) => (
          <div
            key={p._id}
            style={{
              minWidth: 150, flexShrink: 0, background: 'white', border: '1px solid #E8EDF3',
              borderRadius: 14, padding: '18px 14px 14px', textAlign: 'center', position: 'relative',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            {i === 0 && (
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', fontSize: 22 }}>
                👑
              </div>
            )}
            <div style={{
              width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 8px',
              background: '#EBF3FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: '#2B7FFF',
            }}>
              {p.profilePhoto ? (
                <img src={fileUrl(p.profilePhoto)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : getInitials(p.name)}
            </div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{p.professionalType}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#F59E0B' }}>
              ★ {p.rating ? p.rating.toFixed(1) : 'New'}
            </div>
          </div>
        ))}
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
      <h1 className="home-search-heading" style={{
        fontSize: 32,
        fontWeight: 800,
        color: '#1A1A2E',
        marginBottom: 20,
        marginTop: 32,
        letterSpacing: '-0.5px',
        lineHeight: 1.2,
      }}>
        Find Your Care Professional
      </h1>

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

      <Leaderboard />

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
              <div key={p._id} className="pro-card" style={{ position: 'relative' }}>
                {p.isFeatured && (
                  <span style={{
                    position: 'absolute', top: 10, right: 10, background: '#FEF3C7', color: '#B45309',
                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                  }}>
                    ⭐ Featured
                  </span>
                )}
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
  const { user: contextUser } = useAuth();
  const navigate = useNavigate();

  const storedUser = localStorage.getItem('carelyUser');
  const localUser = storedUser ? JSON.parse(storedUser) : null;
  const user = contextUser || localUser;

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user?._id) return;
    socket.emit('joinRoom', user._id);
  }, [user]);

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
        <ProfessionalsSearch />
      </div>
      <AppFooter />
    </div>
  );
}
