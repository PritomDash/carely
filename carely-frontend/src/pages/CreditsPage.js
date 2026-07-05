import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
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
  if (days < 30) return days + ' days ago';
  const months = Math.floor(days / 30);
  return months + (months === 1 ? ' month ago' : ' months ago');
};

const getTxnIcon = (t) => {
  const note = (t.note || '').toLowerCase();
  if (note.includes('emergency')) return '🚨';
  if (note.includes('job') && (note.includes('select') || note.includes('post'))) return '💼';
  if (note.includes('booking')) return '📅';
  if (note.includes('top up') || note.includes('topup') || t.type === 'purchase') return '💰';
  if (t.type === 'bonus') return '🎁';
  if (t.type === 'refund') return '↩️';
  return t.type === 'deduct' ? '➖' : '➕';
};

const STATUS_STYLE = {
  Pending:  { icon: '⏳', color: '#B45309', bg: '#FEF3C7' },
  Approved: { icon: '✓',  color: '#15803D', bg: '#DCFCE7' },
  Rejected: { icon: '✗',  color: '#991B1B', bg: '#FEE2E2' },
};

const STATUS_BANNER = {
  success: { type: 'success', text: 'Payment successful! Your credits will be added shortly.' },
  fail:    { type: 'error', text: 'Payment failed. Please try again.' },
  cancel:  { type: 'error', text: 'Payment was cancelled.' },
  already: { type: 'success', text: 'This payment has already been processed.' },
  error:   { type: 'error', text: 'Something went wrong verifying your payment.' },
};

export default function CreditsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [settings, setSettings] = useState(null);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [topups, setTopups] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedPackIndex, setSelectedPackIndex] = useState(null);
  const [paymentTab, setPaymentTab] = useState('bkash');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionID, setTransactionID] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/api/admin/settings'),
      api.get('/api/credits/my-balance'),
      api.get('/api/credits/my-transactions'),
      api.get('/api/credits/my-topups'),
    ]).then(([settingsRes, balanceRes, txRes, topupRes]) => {
      setSettings(settingsRes.data);
      setBalance(balanceRes.data);
      setTransactions(txRes.data || []);
      setTopups(topupRes.data || []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const statusParam = searchParams.get('status');
  const banner = statusParam ? STATUS_BANNER[statusParam] : null;

  const selectedPack = selectedPackIndex != null ? settings?.creditPacks?.[selectedPackIndex] : null;

  const refCode = (() => {
    const id = user?._id || '';
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    return 'CARE-' + id.slice(-6) + '-' + dd + mm + yy;
  })();

  const handleGatewayPay = async () => {
    if (!selectedPack) return;
    setError(''); setSuccess('');
    setSubmitting(true);
    try {
      const res = await api.post('/api/credits/topup-gateway', {
        credits: selectedPack.credits,
        amountBDT: selectedPack.priceBDT,
      });
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
    try {
      const res = await api.post('/api/credits/topup-manual', {
        credits: selectedPack.credits,
        amountBDT: selectedPack.priceBDT,
        transactionID: transactionID.trim(),
        senderNumber,
        paymentMethod: paymentTab,
      });
      setSuccess(res.data?.message || 'Top up request submitted!');
      setTransactionID('');
      setSenderNumber('');
      setSelectedPackIndex(null);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit top up request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div className="app-page-content" style={{ maxWidth: 800, margin: '0 auto', padding: '28px 20px' }}>
          <p className="text-muted">Loading credits...</p>
        </div>
      </div>
    );
  }

  const credits = balance?.credits ?? 0;
  const balanceColor = credits > 50 ? '#16a34a' : credits >= 10 ? '#B45309' : '#dc2626';
  const isProfessional = user?.role === 'professional';

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div className="app-page-content" style={{ maxWidth: 800, margin: '0 auto', padding: '28px 20px' }}>
        <h2 style={{ marginBottom: 20 }}>My Credits</h2>

        {banner && (
          <div className={banner.type === 'success' ? 'msg-success' : 'msg-error'}>{banner.text}</div>
        )}
        {error && <div className="msg-error">{error}</div>}
        {success && <div className="msg-success">{success}</div>}

        {/* BALANCE */}
        <div className="card">
          <div className="text-muted">Credit Balance</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: balanceColor }}>{credits}</div>
          <div className="text-muted" style={{ marginTop: 4 }}>
            Total received: {balance?.totalReceived ?? 0} &middot; Total used: {balance?.totalUsed ?? 0}
          </div>
          {settings?.freeCreditsEnabled && (
            <div style={{ marginTop: 12, background: '#DCFCE7', color: '#15803D', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600, display: 'inline-block' }}>
              🎉 Credits are currently FREE from Carely
            </div>
          )}
        </div>

        {/* HOW CREDITS WORK */}
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>How Credits Work</h3>
          {isProfessional ? (
            <ul style={{ paddingLeft: 20, color: '#374151', fontSize: 14, lineHeight: 1.9 }}>
              <li>{settings?.bookingAcceptCreditCost ?? 1} credit used when you accept a booking</li>
              <li>{settings?.jobSelectCreditCost ?? 1} credit used when a customer selects you from a job post</li>
              <li>Applying to job posts is always free</li>
            </ul>
          ) : (
            <ul style={{ paddingLeft: 20, color: '#374151', fontSize: 14, lineHeight: 1.9 }}>
              <li>{settings?.emergencyPostCreditCost ?? 1} credit used when you post an emergency job</li>
              <li>All other features are free</li>
            </ul>
          )}
        </div>

        {/* TOP UP */}
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Top Up Credits</h3>

          {!settings?.manualTopUpEnabled && !settings?.paymentGatewayEnabled ? (
            <p className="text-muted">Top up is not available right now. Contact admin for credits.</p>
          ) : (
            <>
              <div className="grid-3">
                {(settings?.creditPacks || []).map((pack, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedPackIndex(i)}
                    className="card"
                    style={{
                      cursor: 'pointer', textAlign: 'center', position: 'relative',
                      border: selectedPackIndex === i ? '2px solid #2B7FFF' : '1px solid #E8EDF0',
                      background: selectedPackIndex === i ? '#EBF3FF' : '#fff',
                    }}
                  >
                    {pack.popular && (
                      <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#F59E0B', color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999 }}>
                        POPULAR
                      </span>
                    )}
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#1A1A2E' }}>{pack.credits}</div>
                    <div className="text-muted">credits</div>
                    <div style={{ marginTop: 8, fontWeight: 700, color: '#2B7FFF' }}>{formatBDT(pack.priceBDT)}</div>
                  </div>
                ))}
              </div>

              {selectedPack && (
                <div style={{ marginTop: 20, borderTop: '1px solid #F1F5F9', paddingTop: 20 }}>
                  <p style={{ marginBottom: 16 }}>
                    Selected: <strong>{selectedPack.credits} credits</strong> for <strong>{formatBDT(selectedPack.priceBDT)}</strong>
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
                        <button
                          type="button"
                          className={paymentTab === 'bkash' ? 'btn-primary' : 'btn-gray'}
                          onClick={() => setPaymentTab('bkash')}
                        >
                          bKash
                        </button>
                        <button
                          type="button"
                          className={paymentTab === 'nagad' ? 'btn-primary' : 'btn-gray'}
                          onClick={() => setPaymentTab('nagad')}
                        >
                          Nagad
                        </button>
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
                        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                          {submitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* PENDING / RECENT TOP UP REQUESTS */}
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Top Up Requests</h3>
          {topups.length === 0 ? (
            <p className="text-muted">No top up requests yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topups.map((t) => {
                const s = STATUS_STYLE[t.status] || STATUS_STYLE.Pending;
                return (
                  <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3F4F6', paddingBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                    <div>
                      <span style={{ color: s.color, fontWeight: 700 }}>{s.icon} {t.status}</span>
                      <span style={{ marginLeft: 8 }}>{t.credits} credits ({formatBDT(t.amountBDT)})</span>
                    </div>
                    <span className="text-muted">{timeAgo(t.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* TRANSACTION HISTORY */}
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Transaction History</h3>
          {transactions.length === 0 ? (
            <p className="text-muted">No transactions yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {transactions.map((t) => (
                <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3F4F6', paddingBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <div>
                    <span style={{ marginRight: 8 }}>{getTxnIcon(t)}</span>
                    <span style={{ fontWeight: 600, color: t.type === 'deduct' ? '#dc2626' : '#16a34a' }}>
                      {t.type === 'deduct' ? '-' : '+'}{t.credits}
                    </span>
                    <span style={{ marginLeft: 8 }}>{t.note}</span>
                  </div>
                  <span className="text-muted">{timeAgo(t.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
