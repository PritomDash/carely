import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import AppNavbar from '../components/AppNavbar';

const formatLocation = (loc) => {
  if (!loc) return 'Location not set';
  return [loc.thana, loc.district, loc.division].filter(Boolean).join(', ') || 'Location not set';
};

export default function JobPostDetail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    api.get(`/api/jobs/${id}`)
      .then((res) => setPost(res.data))
      .catch(() => setError('Failed to load job post'))
      .finally(() => setLoading(false));
  }, [id, user, navigate]);

  const handleApply = async () => {
    setError('');
    setApplying(true);
    try {
      await api.post(`/api/jobs/${id}/apply`);
      setPost((prev) => ({
        ...prev,
        applicants: [...prev.applicants, { professional: { _id: user._id, name: user.name }, status: 'Pending' }],
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply.');
    } finally {
      setApplying(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div className="app-page-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div className="app-page-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p className="text-muted">{error || 'Job post not found.'}</p>
            <Link to="/job-posts" className="btn btn-secondary" style={{ marginTop: 16 }}>Back to Job Posts</Link>
          </div>
        </div>
      </div>
    );
  }

  const alreadyApplied = post.applicants?.some(
    (a) => String(a.professional?._id || a.professional) === String(user._id)
  );

  const selectedApplicant = post.selectedPro
    ? post.applicants?.find((a) => String(a.professional?._id || a.professional) === String(post.selectedPro))
    : null;

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div className="app-page-content" style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <h2>{post.title}</h2>
          {post.isEmergency && <span className="badge badge-red">URGENT</span>}
        </div>

        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span className="badge badge-blue">{post.serviceType}</span>
          <span className="badge badge-gray">{post.status}</span>
        </div>

        <p style={{ marginTop: 16 }}>{post.description}</p>

        <div className="grid-2" style={{ marginTop: 16 }}>
          <div>
            <div className="text-muted">Location</div>
            <div>{formatLocation(post.location)}</div>
          </div>
          <div>
            <div className="text-muted">Booking Type</div>
            <div style={{ textTransform: 'capitalize' }}>{post.bookingType || 'Not specified'}</div>
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: 16 }}>
          <div>
            <div className="text-muted">Start Date</div>
            <div>{post.schedule?.startDate ? new Date(post.schedule.startDate).toLocaleDateString('en-BD') : 'Not specified'}</div>
          </div>
          <div>
            <div className="text-muted">Preferred Time</div>
            <div>{post.schedule?.preferredTime || 'Not specified'}</div>
          </div>
        </div>

        {post.schedule?.preferredDays?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="text-muted">Preferred Days</div>
            <div>{post.schedule.preferredDays.join(', ')}</div>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <div className="text-muted">Budget</div>
          <div style={{ fontWeight: 600, color: '#16a34a' }}>
            {post.budgetBDT ? formatBDT(post.budgetBDT) : 'Not specified'}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <span className="text-muted">{post.applicants?.length || 0} applicant{(post.applicants?.length || 0) === 1 ? '' : 's'}</span>
        </div>

        {post.status === 'InProgress' && selectedApplicant && (
          <div style={{
            marginTop: 16, background: '#dcfce7', border: '1px solid #16a34a',
            borderRadius: 8, padding: '10px 14px'
          }}>
            Selected Professional: <strong>{selectedApplicant.professional?.name || 'Unknown'}</strong>
          </div>
        )}

        {error && (
          <div className="badge badge-red" style={{ display: 'block', marginTop: 16, padding: '8px 12px' }}>{error}</div>
        )}

        {user.role === 'professional' && post.status === 'Open' && (
          <div style={{ marginTop: 20 }}>
            {alreadyApplied ? (
              <span className="badge badge-green">Already Applied</span>
            ) : (
              <button className="btn btn-primary" disabled={applying} onClick={handleApply}>
                {applying ? 'Applying...' : 'Apply'}
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <Link to="/job-posts" className="text-muted">Back to Job Posts</Link>
      </div>
      </div>
    </div>
  );
}
