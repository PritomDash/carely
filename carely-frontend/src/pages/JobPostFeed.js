import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import LocationSelector from '../components/LocationSelector';
import AppNavbar from '../components/AppNavbar';

const PROFESSIONAL_TYPES = ['Child Care', 'Aged Care', 'Nurse', 'Physiotherapist'];

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
  const [location, setLocation] = useState({});
  const [serviceType, setServiceType] = useState('');

  const fetchPosts = useCallback(() => {
    setLoading(true);
    const params = {};
    if (location.division) params.division = location.division;
    if (location.district) params.district = location.district;
    if (location.thana) params.thana = location.thana;
    if (serviceType) params.serviceType = serviceType;

    api.get('/api/jobs', { params })
      .then((res) => setPosts(res.data || []))
      .catch(() => setError('Failed to load job posts'))
      .finally(() => setLoading(false));
  }, [location.division, location.district, location.thana, serviceType]);

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
      if (location.division && p.location?.division !== location.division) return false;
      if (location.district && p.location?.district !== location.district) return false;
      if (location.thana && p.location?.thana !== location.thana) return false;
      return true;
    });
  }, [posts, serviceType, location.division, location.district, location.thana]);

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
        <LocationSelector value={location} onChange={setLocation} />
        <div className="form-group" style={{ marginTop: 12 }}>
          <label>Service Type</label>
          <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
            <option value="">All Types</option>
            {PROFESSIONAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
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
