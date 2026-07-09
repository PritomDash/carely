import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { formatBDT } from '../utils/currency';
import AppNavbar from '../components/AppNavbar';

const timeAgo = (dateStr) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + (minutes === 1 ? ' min ago' : ' mins ago');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return days + ' days ago';
};

const STATUS_STYLE = {
  Pending:  { icon: '⏳', color: '#B45309' },
  Approved: { icon: '✓',  color: '#15803D' },
  Rejected: { icon: '✗',  color: '#991B1B' },
};

const STATUS_BANNER = {
  success: { type: 'success', text: 'Payment successful! Your Boost will activate shortly.' },
  fail:    { type: 'error', text: 'Payment failed. Please try again.' },
  cancel:  { type: 'error', text: 'Payment was cancelled.' },
  already: { type: 'success', text: 'This payment has already been processed.' },
  error:   { type: 'error', text: 'Something went wrong verifying your payment.' },
};

export default function BoostPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedIndex, setSelectedIndex] = useState(null);
  const [paymentTab, setPaymentTab] = useState('bkash');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionID, setTransactionID] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState('idle');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/api/admin/settings'),
      api.get('/api/featured/my-status'),
    ]).then(([settingsRes, statusRes]) => {
      setSettings(settingsRes.data);
      setStatus(statusRes.data);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'professional') { navigate('/home'); return; }
    fetchAll();
  }, [user, navigate, fetchAll]);

  const statusParam = searchParams.get('status');
  const banner = statusParam ? STATUS_BANNER[statusParam] : null;

  const selectedPack = selectedIndex != null ? settings?.featuredPacks?.[selectedIndex] : null;

  const refCode = (() => {
    const id = user?._id || '';
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    return 'BOOST-' + id.slice(-6) + '-' + dd + mm + yy;
  })();

  const handleGatewayPay = async () => {
    if (!selectedPack) return;
    setError(''); setSuccess('');
    setSubmitting(true);
    try {
      const res = await api.post('/api/featured/request-gateway', { tier: selectedPack.tier });
      if (res.data?.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      } else {
        setError('Could not start payment. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Payment initiation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPack) return;
    setError(''); setSuccess('');

    if (!transactionID.trim()) {
      setError('Please enter the transaction ID.');
      return;
    }

    setSubmitting(true);
    setSubmitState('submitting');
    try {
      const res = await api.post('/api/featured/request-manual', {
        tier: selectedPack.tier,
        transactionID: transactionID.trim(),
        senderNumber,
        method: paymentTab,
      });
      setSuccess(res.data?.message || 'Boost request submitted!');
      setSubmitState('success');
      setTransactionID('');
      setSenderNumber('');
      setSelectedIndex(null);
      fetchAll();
      setTimeout(() => setSubmitState('idle'), 2000);
    } catch (err) {
      setSubmitState('error');
      setError(err.response?.data?.error || 'Failed to submit boost request.');
      setTimeout(() => setSubmitState('idle'), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.role !== 'professional') return null;

  if (loading) {
    return (
      <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div className="app-page-content" style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px' }}>
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div className="app-page-content" style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px' }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ marginBottom: 4 }}>Boost Your Profile</h2>
          <p className="text-muted">Get seen first. Get jobs first.</p>
        </div>

        {banner && <div className={banner.type === 'success' ? 'msg-success' : 'msg-error'}>{banner.text}</div>}
        {error && <div className="msg-error">{error}</div>}
        {success && <div className="msg-success">{success}</div>}

        {status?.isFeatured ? (
          <div className="card" style={{ background: '#DCFCE7', border: '1px solid #86EFAC', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#15803D' }}>⭐ Your Boost is active</div>
            <div style={{ color: '#15803D', marginTop: 4 }}>
              Active until {new Date(status.featuredUntil).toLocaleDateString('en-BD')}
              {' '}({Math.max(0, Math.ceil((new Date(status.featuredUntil) - new Date()) / (1000 * 60 * 60 * 24)))} days left)
            </div>
          </div>
        ) : null}

        {/* WHAT YOU GET */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16 }}>What You Get</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>🔝 Top of search results</div>
              <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>
                When customers search for professionals in your area, your profile appears first, above everyone else.
              </p>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>⚡ Job alerts 15 minutes early</div>
              <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>
                You get notified about new job posts {settings?.boostNotificationDelayMinutes ?? 15} minutes before other professionals. Apply first, get chosen first.
              </p>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>⭐ Star badge on your profile</div>
              <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>
                A gold star badge shows customers your profile is boosted.
              </p>
            </div>
          </div>
        </div>

        {/* HONESTY SECTION */}
        <div className="card" style={{ marginBottom: 16, background: '#F7FAFF' }}>
          <h4 style={{ marginBottom: 8, fontSize: 14 }}>What Boost does not do</h4>
          <p className="text-muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
            Boost does not guarantee bookings. It does not verify you. Carely does not verify any professional.
            Boost only helps customers find you faster.
          </p>
        </div>

        {/* PACKS + PURCHASE */}
        {!settings?.featuredListingEnabled ? (
          <div className="card">
            <p className="text-muted">Boost is not available right now.</p>
          </div>
        ) : (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>{status?.isFeatured ? 'Extend Boost' : 'Choose a Pack'}</h3>
            <div className="grid-2">
              {(settings?.featuredPacks || []).map((pack, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className="card"
                  style={{
                    cursor: 'pointer', textAlign: 'center', position: 'relative',
                    border: selectedIndex === i ? '2px solid #F59E0B' : '1px solid #E8EDF0',
                    background: selectedIndex === i ? '#FFFBEB' : '#fff',
                  }}
                >
                  {pack.tier === 'premium' && (
                    <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#F59E0B', color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999 }}>
                      BEST VALUE
                    </span>
                  )}
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1A1A2E', marginTop: 6 }}>{pack.label}</div>
                  <div style={{ marginTop: 8, fontWeight: 700, fontSize: 18, color: '#B45309' }}>{formatBDT(pack.priceBDT)}</div>
                </div>
              ))}
            </div>

            {selectedPack && (
              <div style={{ marginTop: 20, borderTop: '1px solid #F1F5F9', paddingTop: 20 }}>
                <p style={{ marginBottom: 16 }}>
                  Selected: <strong>{selectedPack.label}</strong> for <strong>{formatBDT(selectedPack.priceBDT)}</strong>
                </p>

                {settings?.paymentGatewayEnabled && (
                  <button
                    className="btn btn-primary btn-block"
                    style={{ marginBottom: 20 }}
                    disabled={submitting}
                    onClick={handleGatewayPay}
                  >
                    {submitting ? 'Redirecting...' : 'Pay Online Now'}
                  </button>
                )}

                {settings?.manualTopUpEnabled && (
                  <div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      <button type="button" className={paymentTab === 'bkash' ? 'btn-primary' : 'btn-gray'} onClick={() => setPaymentTab('bkash')}>bKash</button>
                      <button type="button" className={paymentTab === 'nagad' ? 'btn-primary' : 'btn-gray'} onClick={() => setPaymentTab('nagad')}>Nagad</button>
                    </div>

                    <div style={{ background: '#F7FAFF', border: '1px solid #E8EDF3', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                      <div className="text-muted">Send {formatBDT(selectedPack.priceBDT)} to</div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>
                        {paymentTab === 'bkash' ? (settings.platformBkash || 'Not set') : (settings.platformNagad || 'Not set')}
                      </div>
                      <div className="text-muted" style={{ marginTop: 8 }}>Reference</div>
                      <div style={{ fontWeight: 700 }}>{refCode}</div>
                    </div>

                    <form onSubmit={handleManualSubmit}>
                      <div className="form-group">
                        <label>Your Number (sender)</label>
                        <input type="text" value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} placeholder="01XXXXXXXXX" />
                      </div>
                      <div className="form-group">
                        <label>Transaction ID *</label>
                        <input type="text" value={transactionID} onChange={(e) => setTransactionID(e.target.value)} placeholder="e.g. 8N7A6B5C4D" required />
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={submitState === 'submitting' || submitState === 'success'}
                        style={{ background: submitState === 'success' ? '#22C55E' : undefined }}
                      >
                        {submitState === 'idle' && 'Submit Request'}
                        {submitState === 'submitting' && '⏳ Submitting...'}
                        {submitState === 'success' && '✓ Request Submitted!'}
                        {submitState === 'error' && 'Try Again'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {status?.requests?.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 10, fontSize: 14 }}>Boost Requests</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {status.requests.map((r) => {
                const s = STATUS_STYLE[r.status] || STATUS_STYLE.Pending;
                return (
                  <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3F4F6', paddingBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                    <div>
                      <span style={{ color: s.color, fontWeight: 700 }}>{s.icon} {r.status}</span>
                      <span style={{ marginLeft: 8 }}>{r.days} days ({formatBDT(r.amountBDT)})</span>
                    </div>
                    <span className="text-muted">{timeAgo(r.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
