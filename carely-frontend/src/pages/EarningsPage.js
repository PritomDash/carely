import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import AppNavbar from '../components/AppNavbar';

export default function EarningsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    api.get('/api/bookings/my-bookings')
      .then((res) => setBookings((res.data || []).filter((b) => b.status === 'Completed')))
      .catch(() => setError('Failed to load earnings'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div className="app-page-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <p className="text-muted">Loading earnings...</p>
        </div>
      </div>
    );
  }

  const totalEarned = bookings.reduce((sum, b) => sum + (b.proNet ?? b.amount ?? 0), 0);

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div className="app-page-content" style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px' }}>
      <h2 style={{ marginBottom: 16 }}>Earnings</h2>

      {error && (
        <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '10px 14px' }}>{error}</div>
      )}

      <div style={{
        background: 'var(--primary-light)', border: '1px solid var(--border)', borderRadius: 8,
        padding: '10px 14px', fontSize: 13, color: 'var(--primary-dark)', marginBottom: 16
      }}>
        Payment is collected directly from customers. This is for your reference only.
      </div>

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
              <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, borderBottom: '1px solid #f3f4f6', paddingBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{b.customer?.name || 'Customer'}</div>
                  <div className="text-muted">{b.date?.slice(0, 10)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>{formatBDT(b.amount)}</div>
                  <div className="text-muted">Net: {formatBDT(b.proNet ?? b.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <Link to="/professional-profile" className="text-muted">Back to profile</Link>
      </div>
      </div>
    </div>
  );
}
