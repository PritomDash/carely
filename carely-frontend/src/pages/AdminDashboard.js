import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import {
  LayoutDashboard, Users, Calendar, Briefcase, CreditCard,
  Settings as SettingsIcon, MessageSquare, LogOut, XCircle, UserCheck,
} from 'lucide-react';

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'bookings', label: 'Bookings', icon: Calendar },
  { key: 'jobposts', label: 'Job Posts', icon: Briefcase },
  { key: 'credits', label: 'Credits', icon: CreditCard },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
  { key: 'chat', label: 'Chat', icon: MessageSquare },
];

const STATUS_BADGE = {
  Open: 'badge-green', InProgress: 'badge-blue', Completed: 'badge-blue', Expired: 'badge-gray',
  Cancelled: 'badge-red', AwaitingAcceptance: 'badge-yellow', Confirmed: 'badge-green',
  Declined: 'badge-red', 'Auto-Declined': 'badge-red',
};

const formatLocation = (loc) => (loc ? [loc.thana, loc.district, loc.division].filter(Boolean).join(', ') || '—' : '—');

function OverviewTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/admin/analytics')
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading overview...</p>;
  if (error || !data) return <div className="badge badge-red" style={{ display: 'block', padding: '8px 12px' }}>{error || 'No data'}</div>;

  const stats = [
    { label: 'Total Users', value: data.totalUsers, icon: Users },
    { label: 'Professionals', value: data.totalPros, icon: Briefcase },
    { label: 'Customers', value: data.totalCustomers, icon: UserCheck },
    { label: 'Bookings', value: data.totalBookings, icon: Calendar },
    { label: 'Cancelled', value: data.cancelledBookings, icon: XCircle },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Overview</h2>
      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon"><s.icon size={20} /></div>
            <div>
              <div className="stat-value">{s.value ?? 0}</div>
              <div className="text-muted">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    api.get('/api/admin/users')
      .then((res) => setUsers(res.data || []))
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleVerify = async (id) => {
    setBusyId(id); setError('');
    try { await api.put(`/api/admin/users/${id}/verify`); fetchUsers(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to verify user.'); }
    finally { setBusyId(null); }
  };

  const handleSuspend = async (id) => {
    setBusyId(id); setError('');
    try { await api.put(`/api/admin/users/${id}/suspend`); fetchUsers(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to update user.'); }
    finally { setBusyId(null); }
  };

  const handleDelete = async (id) => {
    setBusyId(id); setError('');
    try { await api.delete(`/api/admin/users/${id}`); setConfirmDeleteId(null); fetchUsers(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to delete user.'); }
    finally { setBusyId(null); }
  };

  if (loading) return <p className="text-muted">Loading users...</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Users</h2>
      {error && <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>}
      <div className="card table-scroll">
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Location</th><th>Verified</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                <td>{formatLocation(u.location)}</td>
                <td>
                  <span className={`badge ${u.isVerified ? 'badge-green' : 'badge-gray'}`}>
                    {u.isVerified ? 'Verified' : 'Unverified'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {u.role !== 'admin' && !u.isVerified && (
                      <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} disabled={busyId === u._id} onClick={() => handleVerify(u._id)}>
                        Verify
                      </button>
                    )}
                    {u.role !== 'admin' && (
                      <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: 12 }} disabled={busyId === u._id} onClick={() => handleSuspend(u._id)}>
                        {u.isVerified ? 'Suspend' : 'Reactivate'}
                      </button>
                    )}
                    {u.role !== 'admin' && (
                      confirmDeleteId === u._id ? (
                        <>
                          <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: 12 }} disabled={busyId === u._id} onClick={() => handleDelete(u._id)}>
                            Confirm
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setConfirmDeleteId(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setConfirmDeleteId(u._id)}>
                          Delete
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-mobile-cards">
        {users.map((u) => (
          <div key={u._id} style={{ background: 'white', border: '1px solid #E8EDF3', borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <div style={{ fontWeight: 700 }}>{u.name}</div>
            <div style={{ color: '#64748B', fontSize: 13 }}>{u.email}</div>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{u.role}</span>
              <span className="text-muted">{formatLocation(u.location)}</span>
              <span className={`badge ${u.isVerified ? 'badge-green' : 'badge-gray'}`}>
                {u.isVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {u.role !== 'admin' && !u.isVerified && (
                <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} disabled={busyId === u._id} onClick={() => handleVerify(u._id)}>
                  Verify
                </button>
              )}
              {u.role !== 'admin' && (
                <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: 12 }} disabled={busyId === u._id} onClick={() => handleSuspend(u._id)}>
                  {u.isVerified ? 'Suspend' : 'Reactivate'}
                </button>
              )}
              {u.role !== 'admin' && (
                confirmDeleteId === u._id ? (
                  <>
                    <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: 12 }} disabled={busyId === u._id} onClick={() => handleDelete(u._id)}>
                      Confirm
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setConfirmDeleteId(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setConfirmDeleteId(u._id)}>
                    Delete
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingsTab() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBookings = useCallback(() => {
    setLoading(true);
    api.get('/api/admin/bookings')
      .then((res) => setBookings(res.data || []))
      .catch(() => setError('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  if (loading) return <p className="text-muted">Loading bookings...</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Bookings</h2>
      {error && <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>}
      <div className="card table-scroll">
        <table className="data-table">
          <thead>
            <tr><th>Customer</th><th>Professional</th><th>Date</th><th>Status</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id}>
                <td>{b.customer?.name || '—'}</td>
                <td>{b.professional?.name || '—'}</td>
                <td>{b.date?.slice(0, 10)}</td>
                <td><span className={`badge ${STATUS_BADGE[b.status] || 'badge-gray'}`}>{b.status}</span></td>
                <td>{formatBDT(b.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-mobile-cards">
        {bookings.map((b) => (
          <div key={b._id} style={{ background: 'white', border: '1px solid #E8EDF3', borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 700 }}>{b.customer?.name || '—'}</div>
              <span className={`badge ${STATUS_BADGE[b.status] || 'badge-gray'}`}>{b.status}</span>
            </div>
            <div style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>with {b.professional?.name || '—'}</div>
            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span className="text-muted">{b.date?.slice(0, 10)}</span>
              <strong>{formatBDT(b.amount)}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function JobPostsTab() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/admin/job-posts')
      .then((res) => setPosts(res.data || []))
      .catch(() => setError('Failed to load job posts'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading job posts...</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Job Posts</h2>
      {error && <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>}
      <div className="card table-scroll">
        <table className="data-table">
          <thead><tr><th>Status</th><th>Title</th><th>Customer</th><th>Location</th></tr></thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p._id}>
                <td><span className={`badge ${STATUS_BADGE[p.status] || 'badge-gray'}`}>{p.status}</span></td>
                <td>{p.title}</td>
                <td>{p.customer?.name || '—'}</td>
                <td>{formatLocation(p.location)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-mobile-cards">
        {posts.map((p) => (
          <div key={p._id} style={{ background: 'white', border: '1px solid #E8EDF3', borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 700 }}>{p.title}</div>
              <span className={`badge ${STATUS_BADGE[p.status] || 'badge-gray'}`}>{p.status}</span>
            </div>
            <div style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>{p.customer?.name || '—'}</div>
            <div className="text-muted" style={{ marginTop: 4 }}>{formatLocation(p.location)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreditsTab() {
  const [pros, setPros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [amounts, setAmounts] = useState({});
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState(null);

  const fetchCredits = useCallback(() => {
    setLoading(true);
    api.get('/api/admin/credits')
      .then((res) => setPros(res.data || []))
      .catch(() => setError('Failed to load credits'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCredits(); }, [fetchCredits]);

  const handleAdd = async (id) => {
    setError(''); setSuccess('');
    const credits = Number(amounts[id]);
    if (!credits) {
      setError('Enter a non-zero credit amount.');
      return;
    }
    setBusyId(id);
    try {
      await api.put(`/api/admin/credits/${id}`, { credits, note: notes[id] || '' });
      setAmounts((a) => ({ ...a, [id]: '' }));
      setNotes((n) => ({ ...n, [id]: '' }));
      setSuccess('Credits updated.');
      fetchCredits();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add credits.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p className="text-muted">Loading credits...</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Professional Credits</h2>
      {error && <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>}
      {success && <div className="badge badge-green" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{success}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pros.map((p) => (
          <div key={p._id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div className="text-muted">{p.email}</div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: p.credits < 3 ? '#dc2626' : '#16a34a' }}>
                {p.credits} credits
              </div>
            </div>

            <div className="grid-2" style={{ marginTop: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Add/Remove Credits</label>
                <input
                  type="number"
                  value={amounts[p._id] || ''}
                  onChange={(e) => setAmounts((a) => ({ ...a, [p._id]: e.target.value }))}
                  placeholder="e.g. 10 or -5"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Note</label>
                <input
                  type="text"
                  value={notes[p._id] || ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [p._id]: e.target.value }))}
                  placeholder="Reason"
                />
              </div>
            </div>

            <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busyId === p._id} onClick={() => handleAdd(p._id)}>
              {busyId === p._id ? 'Saving...' : 'Update Credits'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const Toggle = ({ label, description, value, onChange }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0', borderBottom:'1px solid #F1F5F9' }}>
    <div>
      <div style={{ fontWeight:600, fontSize:15, color:'#1A1A2E' }}>{label}</div>
      <div style={{ fontSize:13, color:'#64748B', marginTop:3 }}>{description}</div>
    </div>
    <div
      onClick={() => onChange(!value)}
      style={{
        width:52, height:28, borderRadius:14, cursor:'pointer',
        background: value ? '#2B7FFF' : '#E2E8F0',
        position:'relative', transition:'background 0.2s', flexShrink:0
      }}
    >
      <div style={{
        position:'absolute', top:3,
        left: value ? 26 : 3,
        width:22, height:22, borderRadius:'50%',
        background:'white', transition:'left 0.2s',
        boxShadow:'0 1px 4px rgba(0,0,0,0.2)'
      }} />
    </div>
  </div>
);

function SettingsTab() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/api/admin/settings')
      .then((res) => setSettings(res.data))
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const setField = (field, value) => setSettings((s) => ({ ...s, [field]: value }));

  const handleToggle = async (field, value) => {
    const previous = settings[field];
    setField(field, value);
    setError(''); setSuccess('');
    try {
      const res = await api.put('/api/admin/settings', { ...settings, [field]: value });
      setSettings(res.data);
      setSuccess('Settings saved.');
    } catch (err) {
      setField(field, previous);
      setError(err.response?.data?.error || 'Failed to save settings.');
    }
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await api.put('/api/admin/settings', {
        creditsEnabled: settings.creditsEnabled,
        emergencyPostEnabled: settings.emergencyPostEnabled,
        cashPaymentEnabled: settings.cashPaymentEnabled,
        paymentGatewayEnabled: settings.paymentGatewayEnabled,
        featuredListingEnabled: settings.featuredListingEnabled,
        subscriptionEnabled: settings.subscriptionEnabled,
        commissionRate: settings.commissionRate,
        emergencyPostFee: settings.emergencyPostFee,
        platformBkash: settings.platformBkash,
        platformNagad: settings.platformNagad,
      });
      setSettings(res.data);
      setSuccess('Settings saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <p className="text-muted">Loading settings...</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Platform Settings</h2>
      {error && <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>}
      {success && <div className="badge badge-green" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{success}</div>}

      <div className="card">
        <Toggle
          label="Credits System"
          description="Charge professionals credits to accept bookings"
          value={!!settings.creditsEnabled}
          onChange={(v) => handleToggle('creditsEnabled', v)}
        />
        <Toggle
          label="Emergency Posts"
          description="Allow customers to pay for priority job posts"
          value={!!settings.emergencyPostEnabled}
          onChange={(v) => handleToggle('emergencyPostEnabled', v)}
        />
        <Toggle
          label="Cash Payment"
          description="Allow cash as a payment option"
          value={!!settings.cashPaymentEnabled}
          onChange={(v) => handleToggle('cashPaymentEnabled', v)}
        />
        <Toggle
          label="Featured Listings"
          description="Allow professionals to pay for featured placement"
          value={!!settings.featuredListingEnabled}
          onChange={(v) => handleToggle('featuredListingEnabled', v)}
        />
        <Toggle
          label="Subscription System"
          description="Monthly subscription option for professionals"
          value={!!settings.subscriptionEnabled}
          onChange={(v) => handleToggle('subscriptionEnabled', v)}
        />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="grid-2">
          <div className="form-group">
            <label>Commission Rate (%)</label>
            <input
              type="number" min="0" max="100"
              value={settings.commissionRate ?? 0}
              onChange={(e) => setField('commissionRate', Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Emergency Post Fee (BDT)</label>
            <input
              type="number" min="0"
              value={settings.emergencyPostFee ?? 0}
              onChange={(e) => setField('emergencyPostFee', Number(e.target.value))}
            />
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label>Platform bKash Number</label>
            <input
              type="text"
              value={settings.platformBkash || ''}
              onChange={(e) => setField('platformBkash', e.target.value)}
              placeholder="01XXXXXXXXX"
            />
          </div>
          <div className="form-group">
            <label>Platform Nagad Number</label>
            <input
              type="text"
              value={settings.platformNagad || ''}
              onChange={(e) => setField('platformNagad', e.target.value)}
              placeholder="01XXXXXXXXX"
            />
          </div>
        </div>
        <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

function ChatTab({ adminId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get('/api/admin/chat/chat-users')
      .then((res) => setUsers(res.data || []))
      .catch(() => setError('Failed to load chat users'))
      .finally(() => setLoading(false));
  }, []);

  const openChat = (u) => {
    setSelectedUser(u);
    setMessagesLoading(true);
    api.get(`/api/admin/chat/messages/${u._id}`)
      .then((res) => setMessages(res.data || []))
      .catch(() => setError('Failed to load messages'))
      .finally(() => setMessagesLoading(false));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selectedUser) return;
    setSending(true); setError('');
    try {
      const res = await api.post('/api/admin/chat/send', { recipient: selectedUser._id, message: text.trim() });
      setMessages((prev) => [...prev, res.data.message]);
      setText('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <p className="text-muted">Loading conversations...</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Chat</h2>
      {error && <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>}

      <div className="grid-2" style={{ alignItems: 'flex-start' }}>
        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: 14 }}>Conversations</h3>
          {users.length === 0 ? (
            <p className="text-muted">No conversations yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {users.map((u) => (
                <button
                  key={u._id}
                  onClick={() => openChat(u)}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', background: selectedUser?._id === u._id ? 'var(--primary-light)' : undefined }}
                >
                  {u.name} <span className="text-muted" style={{ marginLeft: 6 }}>({u.role})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 420, padding: 0, overflow: 'hidden' }}>
          {!selectedUser ? (
            <div style={{ margin: 'auto', color: '#6b7280' }}>Select a conversation</div>
          ) : (
            <>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>{selectedUser.name}</div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messagesLoading ? (
                  <p className="text-muted">Loading...</p>
                ) : messages.length === 0 ? (
                  <p className="text-muted">No messages yet.</p>
                ) : (
                  messages.map((m) => {
                    const isMine = String(m.sender) === String(adminId);
                    return (
                      <div key={m._id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '75%', padding: '8px 12px', borderRadius: 12,
                          background: isMine ? 'var(--primary)' : '#f3f4f6', color: isMine ? '#fff' : '#111827',
                        }}>
                          {m.message}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #e5e7eb' }}>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message..."
                  style={{ flex: 1, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' }}
                />
                <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/admin/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="admin-sidebar-logo">Carely Admin</div>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`admin-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
        <button className="admin-tab" onClick={handleLogout} style={{ marginTop: 'auto' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>

      <div className="admin-main">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'bookings' && <BookingsTab />}
        {activeTab === 'jobposts' && <JobPostsTab />}
        {activeTab === 'credits' && <CreditsTab />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'chat' && <ChatTab adminId={user._id} />}
      </div>
    </div>
  );
}
