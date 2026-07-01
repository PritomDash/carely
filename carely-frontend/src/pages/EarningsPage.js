import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';

export default function EarningsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [bkashNumber, setBkashNumber] = useState('');
  const [nagadNumber, setNagadNumber] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    Promise.all([
      api.get('/api/users/me'),
      api.get('/api/bookings/my-bookings'),
    ]).then(([meRes, bookingsRes]) => {
      setProfile(meRes.data);
      setBkashNumber(meRes.data.bkashNumber || '');
      setNagadNumber(meRes.data.nagadNumber || '');
      setBookings((bookingsRes.data || []).filter((b) => b.status === 'Completed'));
    }).catch(() => setError('Failed to load earnings'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const handleSavePayout = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.put('/api/users/update-profile', {
        weekdayRate: profile.weekdayRate,
        saturdayRate: profile.saturdayRate,
        sundayRate: profile.sundayRate,
        hourlyRate: profile.hourlyRate,
        bkashNumber,
        nagadNumber,
      });
      setSuccess('Payout details updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update payout details.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return <div className="page"><p className="text-muted">Loading earnings...</p></div>;
  }

  const totalEarned = bookings.reduce((sum, b) => sum + (b.proNet ?? b.amount ?? 0), 0);

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <h2 style={{ marginBottom: 16 }}>Earnings</h2>

      <div className="card">
        <div className="text-muted">Total Earned</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#16a34a' }}>{formatBDT(totalEarned)}</div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Completed Bookings</h3>
        {bookings.length === 0 ? (
          <p className="text-muted">No completed bookings yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bookings.map((b) => (
              <div key={b._id} style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{b.customer?.name || 'Customer'}</div>
                    <div className="text-muted">{b.date?.slice(0, 10)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div>{formatBDT(b.amount)}</div>
                    <div className="text-muted">Net: {formatBDT(b.proNet ?? b.amount)}</div>
                  </div>
                </div>
                <span className={`badge ${b.payoutStatus === 'Released' ? 'badge-green' : 'badge-yellow'}`} style={{ marginTop: 6, display: 'inline-block' }}>
                  {b.payoutStatus === 'Released' ? 'Paid Out' : 'Payout Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Payout Details</h3>

        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
          padding: '10px 14px', fontSize: 13, color: '#1e40af', marginBottom: 16
        }}>
          Contact admin to receive your payout.
        </div>

        {error && (
          <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>
        )}
        {success && (
          <div className="badge badge-green" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{success}</div>
        )}

        <form onSubmit={handleSavePayout}>
          <div className="grid-2">
            <div className="form-group">
              <label>bKash Number</label>
              <input type="text" value={bkashNumber} onChange={(e) => setBkashNumber(e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
            <div className="form-group">
              <label>Nagad Number</label>
              <input type="text" value={nagadNumber} onChange={(e) => setNagadNumber(e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', marginTop: 8 }}>
            {saving ? 'Saving...' : 'Save Payout Details'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: 20 }}>
        <Link to="/professional-profile" className="text-muted">Back to profile</Link>
      </div>
    </div>
  );
}
