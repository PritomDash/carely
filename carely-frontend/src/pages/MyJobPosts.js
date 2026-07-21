import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import AppNavbar from '../components/AppNavbar';
import Avatar from '../components/Avatar';

const STATUS_BADGE = {
  Open: 'badge-green',
  InProgress: 'badge-blue',
  Completed: 'badge-gray',
  Expired: 'badge-gray',
  Cancelled: 'badge-red',
};

const formatLocation = (loc) => {
  if (!loc) return 'Location not set';
  return [loc.thana, loc.district, loc.division].filter(Boolean).join(', ') || 'Location not set';
};

const Stars = ({ rating = 0 }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} size={12} className="star" fill={n <= Math.round(rating) ? '#f59e0b' : 'none'} strokeWidth={1.5} />
    ))}
    <span className="text-muted" style={{ marginLeft: 4 }}>{rating ? rating.toFixed(1) : 'New'}</span>
  </span>
);

export default function MyJobPosts() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirmingCancelId, setConfirmingCancelId] = useState(null);

  const fetchPosts = useCallback(() => {
    setLoading(true);
    api.get('/api/jobs/my-posts')
      .then((res) => setPosts(res.data || []))
      .catch(() => setError('Failed to load your job posts'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchPosts();
  }, [user, navigate, fetchPosts]);

  const handleSelect = async (postId, proId) => {
    setError('');
    setBusyId(postId);
    try {
      await api.post(`/api/jobs/${postId}/select/${proId}`);
      fetchPosts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to select professional.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (postId) => {
    setError('');
    setBusyId(postId);
    try {
      await api.delete(`/api/jobs/${postId}`);
      setConfirmingCancelId(null);
      fetchPosts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel post.');
    } finally {
      setBusyId(null);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div className="app-page-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <p className="text-muted">Loading your job posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div className="app-page-content" style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2>My Job Posts</h2>
        <Link to="/create-job-post" className="btn btn-primary">Post a Job</Link>
      </div>

      {error && (
        <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>
      )}

      {posts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="text-muted">You haven't posted any jobs yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map((post) => {
            const selectedApplicant = post.selectedPro
              ? post.applicants?.find((a) => String(a.professional?._id || a.professional) === String(post.selectedPro))
              : null;
            const busy = busyId === post._id;

            return (
              <div key={post._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{post.title}</div>
                    <div className="text-muted" style={{ marginTop: 2 }}>
                      Expires: {post.expiresAt ? new Date(post.expiresAt).toLocaleDateString('en-BD') : 'N/A'}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[post.status] || 'badge-gray'}`}>{post.status}</span>
                </div>

                {post.status === 'Open' && (
                  <div style={{ marginTop: 14, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                    <h4 style={{ marginBottom: 10, fontSize: 14 }}>
                      Applicants ({post.applicants?.length || 0})
                    </h4>
                    {(!post.applicants || post.applicants.length === 0) ? (
                      <p className="text-muted">No applicants yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {post.applicants.map((a) => {
                          const pro = a.professional;
                          if (!pro?._id) return null;
                          return (
                            <div key={pro._id} style={{
                              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                              borderBottom: '1px solid #f3f4f6', paddingBottom: 10
                            }}>
                              <Avatar user={pro} size={40} />
                              <div style={{ flex: 1, minWidth: 120 }}>
                                <div style={{ fontWeight: 500 }}>{pro.name}</div>
                                <Stars rating={pro.rating} />
                                <div className="text-muted">{formatLocation(pro.location)}</div>
                                {pro.experience && <div className="text-muted">{pro.experience}</div>}
                              </div>
                              <button className="btn btn-primary" disabled={busy} onClick={() => handleSelect(post._id, pro._id)}>
                                Select
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {post.status === 'InProgress' && selectedApplicant?.professional && (
                  <div style={{
                    marginTop: 14, background: '#dcfce7', border: '1px solid #16a34a',
                    borderRadius: 8, padding: '10px 14px'
                  }}>
                    Selected Professional: <strong>{selectedApplicant.professional.name}</strong>
                  </div>
                )}

                {(post.status === 'Open' || post.status === 'InProgress') && (
                  <div style={{ marginTop: 14 }}>
                    {confirmingCancelId === post._id ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="text-muted">Cancel this post?</span>
                        <button className="btn btn-danger" disabled={busy} onClick={() => handleCancel(post._id)}>
                          {busy ? 'Cancelling...' : 'Yes, Cancel'}
                        </button>
                        <button className="btn btn-secondary" onClick={() => setConfirmingCancelId(null)}>No</button>
                      </div>
                    ) : (
                      <button className="btn btn-outline" onClick={() => setConfirmingCancelId(post._id)}>Cancel Post</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
