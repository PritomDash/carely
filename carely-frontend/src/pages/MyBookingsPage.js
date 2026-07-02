import React, { useState, useEffect, useCallback } from 'react';
import api, { API_BASE } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import AppNavbar from '../components/AppNavbar';

const STATUS_CLASS = {
  AwaitingAcceptance: 'status-awaiting',
  Confirmed: 'status-confirmed',
  Completed: 'status-completed',
  Cancelled: 'status-cancelled',
  Declined: 'status-declined',
  'Auto-Declined': 'status-declined',
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
  const [activeTab, setActiveTab] = useState('All');
  const [expandedId, setExpandedId] = useState(null);

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

  if (!user) return null;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <p className="text-muted">Loading bookings...</p>
        </div>
      </div>
    );
  }

  const sorted = [...bookings].sort((a, b) => new Date(b.date) - new Date(a.date));
  const isCustomer = user.role === 'customer';
  const terminalStatuses = ['Completed', 'Cancelled', 'Declined', 'Auto-Declined'];

  const filtered = sorted.filter((b) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Pending') return b.status === 'AwaitingAcceptance';
    return b.status === activeTab;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 20px' }}>
      <h2 className="page-title">My Bookings</h2>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            className={activeTab === t.key ? 'btn-primary' : 'btn-gray'}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="msg-error">{error}</div>}
      {success && <div className="msg-success">{success}</div>}

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="text-muted">No bookings in this category.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map((b) => {
            const otherParty = isCustomer ? b.professional : b.customer;
            const busy = actionLoadingId === b._id;
            const isExpanded = expandedId === b._id;

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
                  <span className={`badge ${STATUS_CLASS[b.status] || 'status-cancelled'}`}>{b.status}</span>
                </div>

                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><span className="text-muted">Address:</span> {b.address}</div>
                  <div><span className="text-muted">Work:</span> {b.workDescription}</div>
                  <div style={{ fontWeight: 700, color: '#2B7FFF' }}>{formatBDT(b.amount)}</div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #E8EDF3', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div><span className="text-muted">Booking Type:</span> {b.type === 'long' ? 'Long-term' : 'Short-term'}</div>
                    {b.type === 'long' && b.recurringDays?.length > 0 && (
                      <div><span className="text-muted">Repeats On:</span> {b.recurringDays.join(', ')}</div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isCustomer && b.status === 'AwaitingAcceptance' && (
                    <button className="btn-danger" disabled={busy} onClick={() => handleCancel(b._id)}>Cancel</button>
                  )}

                  {isCustomer && b.status === 'Confirmed' && (
                    <>
                      <button className="btn-danger" disabled={busy} onClick={() => handleCancel(b._id)}>Cancel</button>
                      <button className="btn-outline" onClick={() => navigate(`/chat/${otherParty._id}`)}>Chat</button>
                    </>
                  )}

                  {isCustomer && b.status === 'Completed' && !b.rated && (
                    <button className="btn-outline" onClick={() => navigate(`/rate/${b._id}`)}>Rate</button>
                  )}

                  {isCustomer && terminalStatuses.includes(b.status) && (
                    <button className="btn-gray" onClick={() => setExpandedId(isExpanded ? null : b._id)}>
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </button>
                  )}

                  {!isCustomer && b.status === 'AwaitingAcceptance' && (
                    <>
                      <button className="btn-success" disabled={busy} onClick={() => handleAccept(b._id)}>Accept</button>
                      <button className="btn-danger" disabled={busy} onClick={() => handleDecline(b._id)}>Decline</button>
                    </>
                  )}

                  {!isCustomer && b.status === 'Confirmed' && (
                    <>
                      <button className="btn-primary" disabled={busy} onClick={() => handleMarkDone(b._id)}>Mark as Done</button>
                      <button className="btn-outline" onClick={() => navigate(`/chat/${otherParty._id}`)}>Chat</button>
                    </>
                  )}

                  {!isCustomer && b.status === 'Completed' && (
                    <span className="badge status-completed">Completed</span>
                  )}

                  {!isCustomer && (b.status === 'Cancelled' || b.status === 'Declined' || b.status === 'Auto-Declined') && (
                    <span className={`badge ${STATUS_CLASS[b.status] || 'status-cancelled'}`}>{b.status}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Link to="/home" className="text-muted">Back to Home</Link>
      </div>
      </div>
    </div>
  );
}
