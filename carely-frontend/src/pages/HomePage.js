import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import { getAllThanas } from '../utils/locations';
import AppNavbar from '../components/AppNavbar';
import BoostStar from '../components/BoostStar';
import Avatar from '../components/Avatar';
import socket from '../socket';
import { Search, MapPin, Clock, Star } from 'lucide-react';

const PROFESSIONAL_TYPES = ['Child Care', 'Aged Care', 'Nurse', 'Physiotherapist'];
const TYPE_COLORS = {
  'Child Care': { bg: '#EBF5FF', text: '#1A56DB' },
  'Aged Care': { bg: '#F3E8FF', text: '#7E22CE' },
  'Nurse': { bg: '#DCFCE7', text: '#15803D' },
  'Physiotherapist': { bg: '#FFF7ED', text: '#C2410C' },
};

const formatLocation = (loc) => {
  if (!loc) return 'Location not set';
  return [loc.thana, loc.district].filter(Boolean).join(', ') || 'Location not set';
};

// Honest, verifiable trust signals - a real completed-job count and a real
// join date, never a "verified" claim Carely can't actually back up.
const trustSignals = (p) => {
  const parts = [];
  if (p.completedBookingsCount > 0) {
    parts.push(`${p.completedBookingsCount} job${p.completedBookingsCount === 1 ? '' : 's'} completed`);
  }
  if (p.createdAt) {
    parts.push('Joined ' + new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
  }
  return parts.join(' · ');
};

const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
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

function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const width = useWindowWidth();
  const isMobile = width < 480;

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
            className="leaderboard-card"
            style={{
              minWidth: isMobile ? 130 : 150, flexShrink: 0, background: 'white', border: '1px solid #E8EDF3',
              borderRadius: 14, padding: isMobile ? '16px 12px 12px' : '18px 14px 14px', textAlign: 'center', position: 'relative',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            {i === 0 && (
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', fontSize: 22 }}>
                👑
              </div>
            )}
            <div style={{ margin: '0 auto 8px', width: 'fit-content' }}>
              <Avatar user={p} size={isMobile ? 42 : 56} />
            </div>
            <div style={{
              fontWeight: 700,
              fontSize: isMobile ? 12 : 13,
              color: '#1A1A2E',
              marginBottom: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
            }}>
              {p.name}
            </div>
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

const ALL_THANAS = getAllThanas();

function SearchHero({
  keyword, setKeyword,
  locationQuery, setLocationQuery,
  selectedLocation, setSelectedLocation,
  serviceType, setServiceType,
  onSubmit, isMobile,
}) {
  const [suggestions, setSuggestions] = useState([]);

  const fieldStyle = {
    padding: '12px 14px', border: '1.5px solid #E2E8F0', borderRadius: 10,
    fontSize: 14, outline: 'none', background: 'white', color: '#374151',
    width: isMobile ? '100%' : undefined,
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)', padding: isMobile ? '28px 16px' : '40px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ color: 'white', fontSize: isMobile ? 20 : 28, fontWeight: 800, marginBottom: 6 }}>
          Find Care Professionals Near You
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, marginBottom: 24 }}>
          Search by location and service type
        </p>

        <form
          onSubmit={onSubmit}
          style={{
            background: 'white', borderRadius: 16, padding: 16,
            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
            gap: 10, flexWrap: 'wrap', alignItems: isMobile ? 'stretch' : 'flex-end',
          }}
        >
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search by name..."
            style={{ ...fieldStyle, flex: isMobile ? undefined : '1 1 160px' }}
          />

          <div style={{ position: 'relative', flex: isMobile ? undefined : '2 1 360px', width: isMobile ? '100%' : undefined }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>📍</span>
              <input
                type="text"
                placeholder="Search area... e.g. Gulshan, Mirpur, Chittagong"
                value={locationQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocationQuery(val);
                  setSelectedLocation(null);
                  if (val.length > 1) {
                    const matches = ALL_THANAS.filter(t =>
                      t.thana.toLowerCase().includes(val.toLowerCase()) ||
                      t.district.toLowerCase().includes(val.toLowerCase()) ||
                      t.division.toLowerCase().includes(val.toLowerCase())
                    ).slice(0, 8);
                    setSuggestions(matches);
                  } else {
                    setSuggestions([]);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '13px 16px 13px 42px',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: 10,
                  fontSize: 14,
                  outline: 'none',
                  background: 'white',
                }}
                onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E2E8F0';
                  setTimeout(() => setSuggestions([]), 200);
                }}
              />
              {locationQuery && (
                <button
                  type="button"
                  onClick={() => { setLocationQuery(''); setSelectedLocation(null); setSuggestions([]); }}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94A3B8' }}
                >
                  ×
                </button>
              )}
            </div>

            {suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: 'white', border: '1px solid #E2E8F0',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                zIndex: 500, maxHeight: 260, overflowY: 'auto', marginTop: 4,
              }}>
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    onMouseDown={() => {
                      setSelectedLocation(s);
                      setLocationQuery(s.thana + ', ' + s.district);
                      setSuggestions([]);
                    }}
                    style={{
                      padding: '11px 16px',
                      cursor: 'pointer',
                      borderBottom: i < suggestions.length - 1 ? '1px solid #F8FAFF' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F0F7FF'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <span style={{ fontSize: 14 }}>📍</span>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1A1A2E' }}>{s.thana}</span>
                      <span style={{ color: '#64748B', fontSize: 12 }}>{', '}{s.district}{', '}{s.division}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            style={{ ...fieldStyle, flex: isMobile ? undefined : '1 1 160px', cursor: 'pointer' }}
          >
            <option value="">All Types</option>
            {PROFESSIONAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            type="submit"
            style={{
              background: '#2563EB', color: 'white', border: 'none',
              padding: '14px 28px', borderRadius: 10, fontWeight: 800, fontSize: 14,
              cursor: 'pointer', width: isMobile ? '100%' : undefined,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Search size={16} /> Search
          </button>
        </form>
      </div>
    </div>
  );
}

function ProfessionalsGrid({ professionals, loading, cols }) {
  const navigate = useNavigate();

  if (loading) {
    return <p className="text-muted">Loading professionals...</p>;
  }

  if (professionals.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <p className="text-muted">No professionals found. Try a different search or location.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: cols === 1 ? 12 : 16 }}>
      {professionals.map((p) => {
        const typeColor = TYPE_COLORS[p.professionalType] || { bg: '#F1F5F9', text: '#475569' };
        const compact = cols <= 2;
        const avatarSize = compact ? 48 : 60;

        const buttons = (fontSize, padding) => (
          <div className="pro-card-buttons" style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-primary"
              style={{ flex: 1, fontSize, padding }}
              onClick={() => navigate(`/view-profile/${p._id}`)}
            >
              View Profile
            </button>
            <button
              className="btn-primary"
              style={{ flex: 1, fontSize, padding }}
              onClick={() => navigate(`/book/${p._id}`)}
            >
              Book
            </button>
            <button
              className="btn-gray"
              style={{ flex: 1, fontSize, padding }}
              onClick={() => navigate(`/chat/${p._id}`)}
            >
              Chat
            </button>
          </div>
        );

        if (cols === 1) {
          return (
            <div
              key={p._id}
              style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                background: 'white', border: '1px solid #E8EDF3', borderRadius: 14,
                padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', position: 'relative',
              }}
            >
              <div style={{ flexShrink: 0 }}>
                <Avatar user={p} size={56} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pro-name" style={{ fontSize: 15, fontWeight: 700 }}>
                  {p.name}{p.isFeatured && <BoostStar />}
                </div>
                <div className="pro-meta" style={{ fontSize: 12 }}>
                  <MapPin size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {formatLocation(p.location)}
                </div>
                <div style={{ marginTop: 4 }}>
                  <span className="badge" style={{ background: typeColor.bg, color: typeColor.text, fontSize: 10 }}>
                    {p.professionalType}
                  </span>
                </div>
                <div className="pro-meta" style={{ fontSize: 12, marginTop: 4 }}>
                  <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {p.experience || 'Experience not specified'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Stars rating={p.rating} />
                </div>
                {trustSignals(p) && (
                  <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>{trustSignals(p)}</div>
                )}
                <div style={{ fontWeight: 800, color: '#2B7FFF', fontSize: 14, marginTop: 4, marginBottom: 8 }}>
                  {formatBDT(p.weekdayRate || p.hourlyRate)}/hr
                </div>
                {buttons(12, '8px 0')}
              </div>
            </div>
          );
        }

        return (
          <div
            key={p._id}
            className="pro-card"
            style={{ position: 'relative', padding: compact ? 12 : 18 }}
          >
            <div className="pro-card-header">
              <Avatar user={p} size={avatarSize} />
              <div>
                <div className="pro-name" style={{ fontSize: compact ? 14 : 16 }}>
                  {p.name}{p.isFeatured && <BoostStar />}
                </div>
                <div className="pro-meta">
                  <MapPin size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {formatLocation(p.location)}
                </div>
              </div>
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
            {trustSignals(p) && (
              <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>{trustSignals(p)}</div>
            )}

            <div style={{ fontWeight: 800, color: '#2B7FFF', fontSize: 16 }}>
              {formatBDT(p.weekdayRate || p.hourlyRate)}/hr
            </div>

            {buttons(compact ? 12 : 13, compact ? '7px 4px' : '8px 0')}
          </div>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const { user: contextUser } = useAuth();
  const navigate = useNavigate();

  const storedUser = localStorage.getItem('carelyUser');
  const localUser = storedUser ? JSON.parse(storedUser) : null;
  const user = contextUser || localUser;

  const [keyword, setKeyword] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [serviceType, setServiceType] = useState('');
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resultMeta, setResultMeta] = useState({ locationLabel: '', serviceLabel: '', widenedTo: null });

  const width = useWindowWidth();
  const cols = width < 600 ? 1 : width < 900 ? 2 : width < 1200 ? 3 : 4;
  const isMobile = width < 768;

  const runSearch = useCallback(() => {
    setLoading(true);
    const params = {};

    let resolvedLocation = selectedLocation;
    if (!resolvedLocation && locationQuery.trim()) {
      const q = locationQuery.trim().toLowerCase();
      resolvedLocation = ALL_THANAS.find(t =>
        t.thana.toLowerCase().includes(q) ||
        t.district.toLowerCase().includes(q) ||
        t.division.toLowerCase().includes(q)
      ) || null;
    }

    if (resolvedLocation) {
      params.division = resolvedLocation.division;
      params.district = resolvedLocation.district;
      params.thana = resolvedLocation.thana;
    }

    if (serviceType) params.serviceType = serviceType;
    if (keyword.trim()) params.search = keyword.trim();

    const serviceLabel = serviceType ? `${serviceType}s` : 'Professionals';

    api.get('/api/users/professionals', { params })
      .then((res) => {
        setProfessionals(res.data?.professionals || []);
        setResultMeta({
          locationLabel: resolvedLocation ? resolvedLocation.thana : '',
          serviceLabel,
          widenedTo: res.data?.widenedTo || null,
        });
      })
      .catch(() => { setProfessionals([]); setResultMeta({ locationLabel: '', serviceLabel, widenedTo: null }); })
      .finally(() => setLoading(false));
  }, [selectedLocation, locationQuery, serviceType, keyword]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user?._id) return;
    socket.emit('joinRoom', user._id);
  }, [user]);

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    runSearch();
  };

  if (!user) return null;

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />

      <SearchHero
        keyword={keyword}
        setKeyword={setKeyword}
        locationQuery={locationQuery}
        setLocationQuery={setLocationQuery}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        serviceType={serviceType}
        setServiceType={setServiceType}
        onSubmit={handleSubmit}
        isMobile={isMobile}
      />

      <div className="app-page-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
        <Leaderboard />
        {!loading && (
          <div style={{ marginBottom: 12 }}>
            {resultMeta.widenedTo ? (
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>
                {professionals.length === 0 ? (
                  <>No {resultMeta.serviceLabel} on Carely yet{resultMeta.locationLabel ? ` (including near ${resultMeta.locationLabel})` : ''}.</>
                ) : (
                  <>No {resultMeta.serviceLabel} in {resultMeta.locationLabel} yet. Here {professionals.length === 1 ? 'is' : 'are'}{' '}
                  {professionals.length} {resultMeta.serviceLabel} across Bangladesh:</>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>
                {professionals.length} {resultMeta.serviceLabel}
                {resultMeta.locationLabel ? ` near ${resultMeta.locationLabel}` : ''}
              </div>
            )}
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
              Boosted profiles appear first in your area. Carely does not verify professionals.
            </div>
          </div>
        )}
        <ProfessionalsGrid professionals={professionals} loading={loading} cols={cols} />
      </div>
    </div>
  );
}
