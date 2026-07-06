import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import { getAllThanas } from '../utils/locations';
import AppNavbar from '../components/AppNavbar';

const PROFESSIONAL_TYPES = ['Child Care', 'Aged Care', 'Nurse', 'Physiotherapist'];
const ALL_THANAS = getAllThanas();

const formatLocation = (loc) => {
  if (!loc) return 'Location not set';
  return [loc.thana, loc.district, loc.division].filter(Boolean).join(', ') || 'Location not set';
};

const formatSchedule = (schedule) => {
  if (!schedule) return 'Not specified';
  const parts = [];
  if (schedule.startDate) parts.push(new Date(schedule.startDate).toLocaleDateString('en-BD'));
  if (schedule.preferredDays?.length) parts.push(schedule.preferredDays.join(', '));
  if (schedule.preferredTime) parts.push(schedule.preferredTime);
  return parts.length ? parts.join(' • ') : 'Not specified';
};

export default function JobPostFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyingId, setApplyingId] = useState(null);
  const [serviceType, setServiceType] = useState('');

  const [locationQuery, setLocationQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const fetchPosts = useCallback(() => {
    setLoading(true);
    api.get('/api/jobs')
      .then((res) => setPosts(res.data || []))
      .catch(() => setError('Failed to load job posts'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'professional') {
      navigate('/home');
      return;
    }
    fetchPosts();
  }, [user, navigate, fetchPosts]);

  const handleApply = async (postId) => {
    setError('');
    setApplyingId(postId);
    try {
      await api.post(`/api/jobs/${postId}/apply`);
      setPosts((prev) => prev.map((p) =>
        p._id === postId
          ? { ...p, applicants: [...p.applicants, { professional: user._id, status: 'Pending' }] }
          : p
      ));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply.');
    } finally {
      setApplyingId(null);
    }
  };

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (serviceType && p.serviceType !== serviceType) return false;
      if (selectedLocation) {
        const matchesThana = p.location?.thana === selectedLocation.thana;
        const matchesDistrict = p.location?.district === selectedLocation.district;
        if (!matchesThana && !matchesDistrict) return false;
      }
      return true;
    });
  }, [posts, serviceType, selectedLocation]);

  if (!user || user.role !== 'professional') return null;

  if (loading) {
    return (
      <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div className="app-page-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <p className="text-muted">Loading job posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div className="app-page-content" style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px' }}>
      <h2 style={{ marginBottom: 16 }}>Job Posts</h2>

      <div className="card" style={{ marginBottom: 20 }}>
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

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {['All', ...PROFESSIONAL_TYPES].map((t) => {
            const value = t === 'All' ? '' : t;
            const isActive = serviceType === value;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setServiceType(value)}
                className={isActive ? 'btn-primary' : 'btn-gray'}
                style={{ padding: '7px 16px', borderRadius: 999, fontSize: 13 }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>
      )}

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="text-muted">No job posts found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map((post) => {
            const alreadyApplied = post.applicants?.some(
              (a) => String(a.professional?._id || a.professional) === String(user._id)
            );

            return (
              <div key={post._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <Link to={`/job-posts/${post._id}`} style={{ fontWeight: 600, fontSize: 16 }}>
                    {post.title}
                  </Link>
                  {post.isEmergency && <span className="badge badge-red">URGENT</span>}
                </div>

                <p className="text-muted" style={{ marginTop: 6 }}>{post.description}</p>

                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <span className="badge badge-blue">{post.serviceType}</span>
                  <span className="text-muted">{formatLocation(post.location)}</span>
                </div>

                <div className="text-muted" style={{ marginTop: 8 }}>{formatSchedule(post.schedule)}</div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    {post.budgetBDT ? (
                      <span style={{ fontWeight: 600, color: '#16a34a' }}>{formatBDT(post.budgetBDT)}</span>
                    ) : (
                      <span className="text-muted">Budget not specified</span>
                    )}
                    <span className="text-muted" style={{ marginLeft: 12 }}>
                      {post.applicants?.length || 0} applicant{(post.applicants?.length || 0) === 1 ? '' : 's'}
                    </span>
                  </div>

                  {alreadyApplied ? (
                    <span className="badge badge-green">Already Applied</span>
                  ) : (
                    <button
                      className="btn btn-primary"
                      disabled={applyingId === post._id}
                      onClick={() => handleApply(post._id)}
                    >
                      {applyingId === post._id ? 'Applying...' : 'Apply'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
