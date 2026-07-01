import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
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

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <h2 style={{ marginBottom: 16 }}>My Bookings</h2>

      {error && (
        <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>
      )}
      {success && (
        <div className="badge badge-green" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{success}</div>
      )}

      {sorted.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="text-muted">No bookings yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sorted.map((b) => {
            const otherParty = isCustomer ? b.professional : b.customer;
            const busy = actionLoadingId === b._id;

            return (
              <div key={b._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{otherParty?.name || 'Unknown'}</div>
                    <div className="text-muted">{b.date?.slice(0, 10)} at {b.time} &middot; {b.duration}h</div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[b.status] || 'badge-gray'}`}>{b.status}</span>
                </div>

                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><span className="text-muted">Address:</span> {b.address}</div>
                  <div><span className="text-muted">Work:</span> {b.workDescription}</div>
                  <div style={{ fontWeight: 600, color: '#2563EB' }}>{formatBDT(b.amount)}</div>
                </div>

                <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isCustomer && (b.status === 'AwaitingAcceptance' || b.status === 'Confirmed') && (
                    <button className="btn btn-danger" disabled={busy} onClick={() => handleCancel(b._id)}>Cancel Booking</button>
                  )}

                  {isCustomer && b.status === 'Completed' && (
                    <>
                      <button className="btn btn-success" disabled={busy} onClick={() => handleConfirm(b._id)}>Confirm Task</button>
                      <button className="btn btn-warning" disabled={busy} onClick={() => openDispute(b._id)}>Request Refund</button>
                    </>
                  )}

                  {isCustomer && b.status === 'Completed' && !b.rated && (
                    <button className="btn btn-secondary" onClick={() => navigate(`/rate/${b._id}`)}>Rate</button>
                  )}

                  {!isCustomer && b.status === 'AwaitingAcceptance' && (
                    <>
                      <button className="btn btn-primary" disabled={busy} onClick={() => handleAccept(b._id)}>Accept</button>
                      <button className="btn btn-danger" disabled={busy} onClick={() => handleDecline(b._id)}>Decline</button>
                    </>
                  )}

                  {!isCustomer && b.status === 'Confirmed' && (
                    <button className="btn btn-success" disabled={busy} onClick={() => handleMarkDone(b._id)}>Mark as Done</button>
                  )}

                  {b.status === 'Confirmed' && otherParty?._id && (
                    <button className="btn btn-secondary" onClick={() => navigate(`/chat/${otherParty._id}`)}>Chat</button>
                  )}
                </div>

                {disputingId === b._id && (
                  <div style={{ marginTop: 12, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                    <div className="form-group">
                      <label>Reason for refund request</label>
                      <textarea
                        rows={3}
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Explain what went wrong"
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-warning" onClick={() => submitDispute(b._id)}>Submit Refund Request</button>
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
