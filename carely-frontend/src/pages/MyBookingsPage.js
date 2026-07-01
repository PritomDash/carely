import React, { useState, useEffect, useCallback } from 'react';
import api, { API_BASE } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';

const STATUS_BADGE = {
  AwaitingAcceptance: 'badge-yellow',
  Confirmed: 'badge-green',
  Completed: 'badge-blue',
  Disputed: 'badge-orange',
  Cancelled: 'badge-gray',
  Declined: 'badge-red',
  'Auto-Declined': 'badge-red',
  Refunded: 'badge-gray',
};

const FILTER_TABS = [
  { key: 'All', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Confirmed', label: 'Confirmed' },
  { key: 'Completed', label: 'Completed' },
  { key: 'Cancelled', label: 'Cancelled' },
];

const fileUrl = (p) => {
  if (!p) return null;
  const name = String(p).split(/[\\/]/).pop();
  return `${API_BASE}/uploads/documents/${name}`;
};

const getInitials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

const Avatar = ({ src, name, size = 48 }) => (
  <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.35 }}>
    {src ? <img src={src} alt={name} /> : <span>{getInitials(name)}</span>}
  </div>
);

export default function MyBookingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(location.state?.success || '');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [disputingId, setDisputingId] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const fetchBookings = useCallback(() => {
    setLoading(true);
    api.get('/api/bookings/my-bookings')
      .then((res) => setBookings(res.data || []))
      .catch(() => setError('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchBookings();
  }, [user, navigate, fetchBookings]);

  const runAction = async (id, request) => {
    setError('');
    setSuccess('');
    setActionLoadingId(id);
    try {
      await request();
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = (id) => runAction(id, () => api.post(`/api/bookings/cancel/${id}`));
  const handleAccept = (id) => runAction(id, () => api.post(`/api/bookings/accept/${id}`));
  const handleDecline = (id) => runAction(id, () => api.post(`/api/bookings/decline/${id}`));
  const handleMarkDone = (id) => runAction(id, () => api.post(`/api/bookings/mark-done/${id}`));
  const handleConfirm = (id) => runAction(id, () => api.post(`/api/bookings/action/${id}`, { action: 'confirm' }));

  const openDispute = (id) => {
    setDisputingId(id);
    setDisputeReason('');
  };

  const submitDispute = (id) => {
    runAction(id, () => api.post(`/api/bookings/action/${id}`, { action: 'dispute', reason: disputeReason }));
    setDisputingId(null);
  };

  if (!user) return null;

  if (loading) {
    return <div className="page"><p className="text-muted">Loading bookings...</p></div>;
  }

  const sorted = [...bookings].sort((a, b) => new Date(b.date) - new Date(a.date));
  const isCustomer = user.role === 'customer';

  const filtered = sorted.filter((b) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Pending') return b.status === 'AwaitingAcceptance';
    return b.status === activeTab;
  });

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <h2 style={{ marginBottom: 16 }}>My Bookings</h2>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            className={`btn ${activeTab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 18px' }}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '10px 14px' }}>{error}</div>
      )}
      {success && (
        <div className="badge badge-green" style={{ display: 'block', marginBottom: 16, padding: '10px 14px' }}>{success}</div>
      )}

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="text-muted">No bookings in this category.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map((b) => {
            const otherParty = isCustomer ? b.professional : b.customer;
            const busy = actionLoadingId === b._id;

            return (
              <div key={b._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Avatar src={fileUrl(otherParty?.profilePhoto)} name={otherParty?.name} size={48} />
                    <div>
                      <div style={{ fontWeight: 700 }}>{otherParty?.name || 'Unknown'}</div>
                      <div className="text-muted">{b.date?.slice(0, 10)} at {b.time} &middot; {b.duration}h</div>
                      {b.professional?.professionalType && (
                        <span className="badge badge-blue" style={{ marginTop: 4, display: 'inline-block' }}>
                          {b.professional.professionalType}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[b.status] || 'badge-gray'}`}>{b.status}</span>
                </div>

                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><span className="text-muted">Address:</span> {b.address}</div>
                  <div><span className="text-muted">Work:</span> {b.workDescription}</div>
                  <div style={{ fontWeight: 700, color: '#1E40AF' }}>{formatBDT(b.amount)}</div>
                </div>

                <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isCustomer && b.status === 'AwaitingAcceptance' && (
                    <button className="btn btn-danger" disabled={busy} onClick={() => handleCancel(b._id)}>Cancel</button>
                  )}

                  {isCustomer && b.status === 'Confirmed' && (
                    <>
                      <button className="btn btn-danger" disabled={busy} onClick={() => handleCancel(b._id)}>Cancel</button>
                      <button className="btn btn-secondary" onClick={() => navigate(`/chat/${otherParty._id}`)}>Chat</button>
                    </>
                  )}

                  {isCustomer && b.status === 'Completed' && (
                    <>
                      <button className="btn btn-success" disabled={busy} onClick={() => handleConfirm(b._id)}>Confirm Done</button>
                      <button className="btn btn-warning" disabled={busy} onClick={() => openDispute(b._id)}>Dispute</button>
                      {!b.rated && (
                        <button className="btn btn-primary" onClick={() => navigate(`/rate/${b._id}`)}>Rate</button>
                      )}
                    </>
                  )}

                  {!isCustomer && b.status === 'AwaitingAcceptance' && (
                    <>
                      <button className="btn btn-success" disabled={busy} onClick={() => handleAccept(b._id)}>Accept</button>
                      <button className="btn btn-danger" disabled={busy} onClick={() => handleDecline(b._id)}>Decline</button>
                    </>
                  )}

                  {!isCustomer && b.status === 'Confirmed' && (
                    <>
                      <button className="btn btn-secondary" onClick={() => navigate(`/chat/${otherParty._id}`)}>Chat</button>
                      <button className="btn btn-success" disabled={busy} onClick={() => handleMarkDone(b._id)}>Mark as Done</button>
                    </>
                  )}
                </div>

                {disputingId === b._id && (
                  <div style={{ marginTop: 12, borderTop: '1px solid #E2E8F0', paddingTop: 12 }}>
                    <div className="form-group">
                      <label>Reason for dispute</label>
                      <textarea
                        rows={3}
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Explain what went wrong"
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-warning" onClick={() => submitDispute(b._id)}>Submit Dispute</button>
                      <button className="btn btn-secondary" onClick={() => setDisputingId(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Link to="/home" className="text-muted">Back to Home</Link>
      </div>
    </div>
  );
}
