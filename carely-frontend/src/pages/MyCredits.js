import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import AppNavbar from '../components/AppNavbar';

export default function MyCredits() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creditsEnabled, setCreditsEnabled] = useState(false);
  const [settings, setSettings] = useState(null);
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    api.get('/api/admin/settings').then((settingsRes) => {
      const s = settingsRes.data || {};
      setSettings(s);
      setCreditsEnabled(!!s.creditsEnabled);

      if (!s.creditsEnabled) {
        setLoading(false);
        return;
      }

      Promise.all([
        api.get('/api/users/me'),
        api.get('/api/users/credit-transactions').catch(() => ({ data: [] })),
      ]).then(([meRes, txRes]) => {
        setProfile(meRes.data);
        setTransactions(txRes.data || []);
      }).catch(() => setError('Failed to load credit info'))
        .finally(() => setLoading(false));
    }).catch(() => {
      setError('Failed to load settings');
      setLoading(false);
    });
  }, [user, navigate]);

  if (!user) return null;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!creditsEnabled) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '28px 20px' }}>
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <h2 style={{ marginBottom: 12 }}>Credits</h2>
            <p className="text-muted">
              Credits are currently free — you can accept unlimited bookings.
            </p>
            <Link to="/professional-profile" className="btn btn-secondary" style={{ marginTop: 20 }}>Back to Profile</Link>
          </div>
        </div>
      </div>
    );
  }

  const credits = profile?.credits ?? 0;
  const lowBalance = credits < 3;

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px' }}>
      <h2 style={{ marginBottom: 16 }}>My Credits</h2>

      {error && (
        <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>
      )}

      <div className="card">
        <div className="text-muted">Credit Balance</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: lowBalance ? '#dc2626' : '#16a34a' }}>{credits}</div>
        <div className="text-muted" style={{ marginTop: 4 }}>Total used: {profile?.totalCreditsUsed ?? 0}</div>

        {lowBalance && (
          <div className="badge badge-red" style={{ display: 'block', marginTop: 12, padding: '8px 12px' }}>
            Your credit balance is low. Top up soon to keep accepting bookings.
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Transaction History</h3>
        {transactions.length === 0 ? (
          <p className="text-muted">No transactions to show yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {transactions.map((t) => (
              <div key={t._id} style={{
                display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap',
                borderBottom: '1px solid #f3f4f6', paddingBottom: 8
              }}>
                <div>
                  <div style={{ textTransform: 'capitalize', fontWeight: 500 }}>{t.type}</div>
                  <div className="text-muted">{t.note}</div>
                  <div className="text-muted">{new Date(t.createdAt).toLocaleDateString('en-BD')}</div>
                </div>
                <div style={{ fontWeight: 600, color: t.type === 'deduct' ? '#dc2626' : '#16a34a' }}>
                  {t.type === 'deduct' ? '-' : '+'}{t.credits}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Top Up Credits</h3>
        <p className="text-muted" style={{ marginBottom: 12 }}>
          Send payment to one of the numbers below, then contact admin with your payment reference to receive your credits.
        </p>

        <div className="grid-2" style={{ marginBottom: 16 }}>
          {settings?.platformBkash && (
            <div>
              <div className="text-muted">bKash</div>
              <div style={{ fontWeight: 600 }}>{settings.platformBkash}</div>
            </div>
          )}
          {settings?.platformNagad && (
            <div>
              <div className="text-muted">Nagad</div>
              <div style={{ fontWeight: 600 }}>{settings.platformNagad}</div>
            </div>
          )}
        </div>

        {settings?.creditPacks?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {settings.creditPacks.map((pack, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                border: '1px solid #e5e7eb', borderRadius: 8
              }}>
                <span>{pack.label || `${pack.credits} credits`}</span>
                <span style={{ fontWeight: 600 }}>{formatBDT(pack.price)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <Link to="/professional-profile" className="text-muted">Back to Profile</Link>
      </div>
      </div>
    </div>
  );
}
