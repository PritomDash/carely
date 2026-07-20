import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSearchParams, Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import AppNavbar from '../components/AppNavbar';
import { isValidPhone, PHONE_HINT } from '../utils/phoneValidation';

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
  if (note.includes('top up') || note.includes('topup') || t.type === 'purchase') return '💰';
  if (t.type === 'bonus') return '🎁';
  if (t.type === 'refund') return '↩️';
  return t.type === 'deduct' ? '➖' : '➕';
};

const STATUS_STYLE = {
  Pending:  { icon: '⏳', color: '#B45309' },
  Approved: { icon: '✓',  color: '#15803D' },
  Rejected: { icon: '✗',  color: '#991B1B' },
};

const STATUS_BANNER = {
  success: { type: 'success', text: 'Payment successful! Your credits will be added shortly.' },
  fail:    { type: 'error', text: 'Payment failed. Please try again.' },
  cancel:  { type: 'error', text: 'Payment was cancelled.' },
  already: { type: 'success', text: 'This payment has already been processed.' },
  error:   { type: 'error', text: 'Something went wrong verifying your payment.' },
};

// Professionals never spend credits under the current model - Carely never
// takes money from their earnings, and accepting/applying to jobs is
// always free. This page is customer-only in substance; professionals get
// a short explanation and a Boost Profile call-to-action instead.
function ProfessionalCreditsNotice() {
  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div className="app-page-content" style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: 12 }}>Professionals don't need credits</h2>
          <p className="text-muted" style={{ lineHeight: 1.8, marginBottom: 20 }}>
            Accepting bookings and applying to jobs is always free on Carely.
            Carely never takes money from your earnings.
          </p>
          <p style={{ fontWeight: 700, marginBottom: 12 }}>Want to get seen first?</p>
          <Link to="/boost" className="btn btn-primary">Boost Your Profile</Link>
        </div>
      </div>
    </div>
  );
}

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
  const [submitState, setSubmitState] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refCopied, setRefCopied] = useState(false);

  const isProfessional = user?.role === 'professional';

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

  useEffect(() => {
    if (isProfessional) { setLoading(false); return; }
    fetchAll();
  }, [fetchAll, isProfessional]);

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

  const copyRefCode = () => {
    navigator.clipboard?.writeText(refCode).then(() => {
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 2000);
    }).catch(() => {});
  };

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

  const platformNumber = paymentTab === 'bkash' ? settings?.platformBkash : settings?.platformNagad;

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPack) return;
    setError(''); setSuccess('');

    if (!platformNumber) {
      setError('Payment number is not configured yet. Please contact support.');
      return;
    }

    if (!transactionID.trim()) {
      setError('Please enter the transaction ID.');
      return;
    }

    if (senderNumber && !isValidPhone(senderNumber)) {
      setError(PHONE_HINT);
      return;
    }

    setSubmitting(true);
    setSubmitState('submitting');
    try {
      const res = await api.post('/api/credits/topup-manual', {
        credits: selectedPack.credits,
        amountBDT: selectedPack.priceBDT,
        transactionID: transactionID.trim(),
        senderNumber,
        paymentMethod: paymentTab,
      });
      setSuccess(res.data?.message || 'Top up request submitted!');
      setSubmitState('success');
      setTransactionID('');
      setSenderNumber('');
      setSelectedPackIndex(null);
      fetchAll();
      window.dispatchEvent(new Event('carely-credits-changed'));
      setTimeout(() => setSubmitState('idle'), 2000);
    } catch (err) {
      setSubmitState('error');
      setError(err.response?.data?.error || 'Failed to submit top up request.');
      setTimeout(() => setSubmitState('idle'), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  if (isProfessional) return <ProfessionalCreditsNotice />;

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
  const balanceColor = credits >= (settings?.emergencyPostCreditCost ?? 3) ? '#16a34a' : '#dc2626';
  const emergencyCost = settings?.emergencyPostCreditCost ?? 3;

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
          <div style={{ fontSize: 40, fontWeight: 800, color: balanceColor }}>{credits} Credits</div>
          <div className="text-muted" style={{ marginTop: 4 }}>
            Credits are used only for Emergency job posts.
          </div>
        </div>

        {/* WHAT ARE CREDITS FOR */}
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>What are credits for?</h3>
          <p style={{ color: '#374151', fontSize: 14, lineHeight: 1.8 }}>
            Credits are only needed if you post an Emergency job. Everything else on Carely is free -
            browsing professionals, booking, chatting, and posting normal job posts.
          </p>
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', marginTop: 12 }}>
            <div style={{ fontWeight: 700, color: '#991B1B', marginBottom: 4 }}>Emergency post = {emergencyCost} credits</div>
            <p style={{ margin: 0, fontSize: 13, color: '#7F1D1D', lineHeight: 1.6 }}>
              An emergency post instantly notifies every matching professional in your area and appears
              at the top of the job feed with an URGENT badge.
            </p>
          </div>
        </div>

        {/* BUY CREDITS */}
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Buy Credits</h3>

          {!settings?.manualTopUpEnabled && !settings?.paymentGatewayEnabled ? (
            <p className="text-muted">Top up is not available right now. Contact admin for credits.</p>
          ) : (
            <>
              <div className="grid-2">
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
                        {platformNumber ? (
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{platformNumber}</div>
                        ) : (
                          <div style={{ color: '#991B1B', fontWeight: 700, fontSize: 14 }}>
                            Not configured yet - please contact support before sending payment.
                          </div>
                        )}
                        <div className="text-muted" style={{ marginTop: 8 }}>Reference</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700 }}>{refCode}</span>
                          <button
                            type="button"
                            onClick={copyRefCode}
                            style={{
                              background: refCopied ? '#DCFCE7' : '#EBF3FF', color: refCopied ? '#15803D' : '#2B7FFF',
                              border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            {refCopied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                          Send exactly {formatBDT(selectedPack.priceBDT)} to the number above, then enter the Transaction ID below.
                          Your credits are added once we verify - usually within a few hours.
                        </p>
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
                          disabled={submitState === 'submitting' || submitState === 'success' || !platformNumber}
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
