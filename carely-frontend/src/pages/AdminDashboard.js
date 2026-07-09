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
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

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

  const q = search.trim().toLowerCase();
  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    if (!matchesRole) return false;
    if (!q) return true;
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Users ({users.length} total)</h2>
      {error && <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <input
          type="text"
          className="input"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 240px', minWidth: 200 }}
        />
        <select
          className="input"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ width: 160 }}
        >
          <option value="all">All Roles</option>
          <option value="customer">Customer</option>
          <option value="professional">Professional</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <p className="text-muted" style={{ marginBottom: 12 }}>
        Showing {filteredUsers.length} of {users.length} users
      </p>
      <div className="card table-scroll">
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Location</th><th>Verified</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
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
        {filteredUsers.map((u) => (
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

function PaymentGatewaySection() {
  const [settings, setSettings] = useState(null);
  const [provider, setProvider] = useState('shurjopay');
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSettings = useCallback(() => {
    setLoading(true);
    api.get('/api/admin/settings')
      .then((res) => {
        setSettings(res.data);
        setProvider(res.data.paymentGatewayProvider !== 'none' ? res.data.paymentGatewayProvider : 'shurjopay');
        setFields({
          shurjopayUsername: res.data.shurjopayUsername || '',
          shurjopayPassword: res.data.shurjopayPassword || '',
          shurjopayClientId: res.data.shurjopayClientId || '',
          shurjopayClientSecret: res.data.shurjopayClientSecret || '',
          shurjopayBaseUrl: res.data.shurjopayBaseUrl || 'https://sandbox.shurjopayment.com',
          sslcommerzStoreId: res.data.sslcommerzStoreId || '',
          sslcommerzPassword: res.data.sslcommerzPassword || '',
          sslcommerzSandbox: res.data.sslcommerzSandbox !== false,
        });
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const setFieldVal = (k, v) => setFields((f) => ({ ...f, [k]: v }));

  const handleToggleEnabled = async () => {
    setError(''); setSuccess('');
    const next = !settings.paymentGatewayEnabled;
    setSettings((s) => ({ ...s, paymentGatewayEnabled: next }));
    try {
      const res = await api.put('/api/admin/settings', { paymentGatewayEnabled: next, paymentGatewayProvider: provider });
      setSettings(res.data);
      setSuccess(next ? 'Payment gateway enabled.' : 'Payment gateway disabled.');
    } catch (err) {
      setSettings((s) => ({ ...s, paymentGatewayEnabled: !next }));
      setError(err.response?.data?.error || 'Failed to update.');
    }
  };

  const handleSaveCredentials = async () => {
    setSaving(true); setError(''); setSuccess(''); setTestMsg('');
    try {
      const res = await api.put('/api/admin/settings', { paymentGatewayProvider: provider, ...fields });
      setSettings(res.data);
      setSuccess('Gateway credentials saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save credentials.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = () => {
    setTestMsg('');
    if (provider === 'shurjopay') {
      const missing = ['shurjopayUsername', 'shurjopayPassword', 'shurjopayClientId', 'shurjopayClientSecret', 'shurjopayBaseUrl']
        .filter((k) => !fields[k]);
      if (missing.length > 0) {
        setTestMsg('⚠️ Missing fields: ' + missing.join(', '));
        return;
      }
      setTestMsg('✓ Configuration looks complete. Save it, then enable the gateway — real connectivity is confirmed on the first live payment attempt.');
    } else {
      const missing = ['sslcommerzStoreId', 'sslcommerzPassword'].filter((k) => !fields[k]);
      if (missing.length > 0) {
        setTestMsg('⚠️ Missing fields: ' + missing.join(', '));
        return;
      }
      setTestMsg('✓ Configuration looks complete. Save it, then enable the gateway — real connectivity is confirmed on the first live payment attempt.');
    }
  };

  if (loading || !settings) return <p className="text-muted">Loading payment gateway...</p>;

  const enabled = !!settings.paymentGatewayEnabled;

  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>Payment Gateway Setup</h3>
      {error && <div className="badge badge-red" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{error}</div>}
      {success && <div className="badge badge-green" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{success}</div>}

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        padding: '16px', borderRadius: 12, marginBottom: 16,
        background: enabled ? '#DCFCE7' : '#F1F5F9',
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: enabled ? '#15803D' : '#475569' }}>
            Payment Gateway: {enabled ? `ACTIVE via ${settings.paymentGatewayProvider}` : 'DISABLED'}
          </div>
          <div className="text-muted" style={{ marginTop: 4 }}>
            {enabled ? 'Payments are being processed automatically.' : 'Enable to accept automatic online payments.'}
          </div>
        </div>
        <Toggle label="" description="" value={enabled} onChange={handleToggleEnabled} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" className={provider === 'shurjopay' ? 'btn-primary' : 'btn-gray'} onClick={() => setProvider('shurjopay')}>ShurjoPay</button>
        <button type="button" className={provider === 'sslcommerz' ? 'btn-primary' : 'btn-gray'} onClick={() => setProvider('sslcommerz')}>SSLCommerz</button>
      </div>

      {provider === 'shurjopay' ? (
        <div>
          <div className="form-group">
            <label>Username</label>
            <input type="text" value={fields.shurjopayUsername} onChange={(e) => setFieldVal('shurjopayUsername', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={fields.shurjopayPassword} onChange={(e) => setFieldVal('shurjopayPassword', e.target.value)} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Client ID</label>
              <input type="text" value={fields.shurjopayClientId} onChange={(e) => setFieldVal('shurjopayClientId', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Client Secret</label>
              <input type="password" value={fields.shurjopayClientSecret} onChange={(e) => setFieldVal('shurjopayClientSecret', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Base URL</label>
            <input type="text" value={fields.shurjopayBaseUrl} onChange={(e) => setFieldVal('shurjopayBaseUrl', e.target.value)} placeholder="https://sandbox.shurjopayment.com" />
          </div>
        </div>
      ) : (
        <div>
          <div className="form-group">
            <label>Store ID</label>
            <input type="text" value={fields.sslcommerzStoreId} onChange={(e) => setFieldVal('sslcommerzStoreId', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Store Password</label>
            <input type="password" value={fields.sslcommerzPassword} onChange={(e) => setFieldVal('sslcommerzPassword', e.target.value)} />
          </div>
          <Toggle
            label="Sandbox mode"
            description="Use SSLCommerz sandbox environment for testing"
            value={!!fields.sslcommerzSandbox}
            onChange={(v) => setFieldVal('sslcommerzSandbox', v)}
          />
        </div>
      )}

      {testMsg && <div className="badge badge-blue" style={{ display: 'block', margin: '12px 0', padding: '8px 12px' }}>{testMsg}</div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-outline" onClick={handleTestConnection}>Test Connection</button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSaveCredentials}>
          {saving ? 'Saving...' : 'Save Credentials'}
        </button>
      </div>
    </div>
  );
}

function ManualTopUpSection() {
  const [settings, setSettings] = useState(null);
  const [platformBkash, setPlatformBkash] = useState('');
  const [platformNagad, setPlatformNagad] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/api/admin/settings'),
      api.get('/api/admin/topup-requests'),
    ]).then(([settingsRes, reqRes]) => {
      setSettings(settingsRes.data);
      setPlatformBkash(settingsRes.data.platformBkash || '');
      setPlatformNagad(settingsRes.data.platformNagad || '');
      setRequests(reqRes.data || []);
    }).catch(() => setError('Failed to load top up data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggle = async () => {
    setError(''); setSuccess('');
    const next = !settings.manualTopUpEnabled;
    setSettings((s) => ({ ...s, manualTopUpEnabled: next }));
    try {
      const res = await api.put('/api/admin/settings', { manualTopUpEnabled: next });
      setSettings(res.data);
    } catch (err) {
      setSettings((s) => ({ ...s, manualTopUpEnabled: !next }));
      setError('Failed to update.');
    }
  };

  const handleSaveNumbers = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await api.put('/api/admin/settings', { platformBkash, platformNagad });
      setSettings(res.data);
      setSuccess('Platform numbers saved.');
    } catch (err) {
      setError('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id) => {
    setBusyId(id); setError(''); setSuccess('');
    try {
      await api.put(`/api/admin/topup-requests/${id}/approve`);
      setSuccess('Top up approved.');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id) => {
    setBusyId(id); setError(''); setSuccess('');
    try {
      await api.put(`/api/admin/topup-requests/${id}/reject`, { reason: rejectReason || 'Could not verify transaction' });
      setSuccess('Top up rejected.');
      setRejectingId(null);
      setRejectReason('');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading || !settings) return <p className="text-muted">Loading manual top up...</p>;

  const sortedOldestFirst = [...requests].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Manual Top Up Requests</h3>
      {error && <div className="badge badge-red" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{error}</div>}
      {success && <div className="badge badge-green" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{success}</div>}

      <Toggle
        label="Manual Top Up Enabled"
        description="Allow users to submit bKash/Nagad transaction IDs for manual approval"
        value={!!settings.manualTopUpEnabled}
        onChange={handleToggle}
      />

      <div className="grid-2" style={{ marginTop: 12 }}>
        <div className="form-group">
          <label>Platform bKash Number</label>
          <input type="text" value={platformBkash} onChange={(e) => setPlatformBkash(e.target.value)} placeholder="01XXXXXXXXX" />
        </div>
        <div className="form-group">
          <label>Platform Nagad Number</label>
          <input type="text" value={platformNagad} onChange={(e) => setPlatformNagad(e.target.value)} placeholder="01XXXXXXXXX" />
        </div>
      </div>
      <button className="btn btn-primary" disabled={saving} onClick={handleSaveNumbers}>
        {saving ? 'Saving...' : 'Save Numbers'}
      </button>

      <div style={{ marginTop: 20, borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <h4 style={{ margin: 0 }}>Pending Requests</h4>
          <span className="badge badge-yellow">{sortedOldestFirst.length} pending</span>
        </div>

        {sortedOldestFirst.length === 0 ? (
          <p className="text-muted">No pending requests.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th><th>Role</th><th>Credits</th><th>Amount</th><th>Method</th><th>TRX ID</th><th>Submitted</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedOldestFirst.map((r) => (
                  <tr key={r._id}>
                    <td>{r.user?.name || '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{r.user?.role}</td>
                    <td>{r.credits}</td>
                    <td>{formatBDT(r.amountBDT)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{r.paymentMethod}</td>
                    <td>{r.transactionID}</td>
                    <td>{new Date(r.createdAt).toLocaleString('en-BD')}</td>
                    <td>
                      {rejectingId === r._id ? (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason"
                            style={{ width: 120, padding: '4px 8px', fontSize: 12 }}
                          />
                          <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 12 }} disabled={busyId === r._id} onClick={() => handleReject(r._id)}>Confirm</button>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setRejectingId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-success" style={{ padding: '4px 8px', fontSize: 12 }} disabled={busyId === r._id} onClick={() => handleApprove(r._id)}>✓ Approve</button>
                          <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 12 }} disabled={busyId === r._id} onClick={() => { setRejectingId(r._id); setRejectReason(''); }}>✗ Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RenewAllSection() {
  const [settings, setSettings] = useState(null);
  const [proAmount, setProAmount] = useState(0);
  const [custAmount, setCustAmount] = useState(10);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/admin/settings').then((res) => {
      setSettings(res.data);
      setProAmount(res.data.freeCreditsAmount ?? 500);
      setCustAmount(res.data.customerFreeCredits ?? 10);
    }).catch(() => {});
  }, []);

  const handleRenew = async () => {
    setSaving(true); setError(''); setResult(null);
    try {
      const res = await api.post('/api/admin/credits/renew-all', { proAmount: Number(proAmount), custAmount: Number(custAmount) });
      setResult(res.data);
      setConfirming(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Renewal failed.');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return null;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Give Free Credits to All Users</h3>
      {error && <div className="badge badge-red" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{error}</div>}
      {result && (
        <div className="badge badge-green" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>
          Done! Updated {result.professionalsUpdated} professionals + {result.customersUpdated} customers
        </div>
      )}

      <div className="grid-2">
        <div className="form-group">
          <label>Professional Credits</label>
          <input type="number" min="0" value={proAmount} onChange={(e) => setProAmount(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Customer Credits</label>
          <input type="number" min="0" value={custAmount} onChange={(e) => setCustAmount(e.target.value)} />
        </div>
      </div>

      {confirming ? (
        <div style={{ background: '#FEF3C7', borderRadius: 8, padding: 14 }}>
          <p style={{ marginBottom: 12, color: '#92400E' }}>
            Add {proAmount} credits to all professionals and {custAmount} credits to all customers?
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger" disabled={saving} onClick={handleRenew}>
              {saving ? 'Renewing...' : 'Yes, Renew for Everyone'}
            </button>
            <button className="btn btn-secondary" onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={() => { setConfirming(true); setResult(null); }}>
          Renew Credits for Everyone
        </button>
      )}
    </div>
  );
}

function IndividualCreditsSection() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/api/admin/users')
      .then((res) => setUsers(res.data || []))
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const matches = query.trim().length === 0 ? [] : users.filter((u) =>
    u.name?.toLowerCase().includes(query.toLowerCase()) || u.email?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  const handleAdd = async () => {
    setError(''); setSuccess('');
    const credits = Number(amount);
    if (!credits) {
      setError('Enter a non-zero credit amount.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put(`/api/admin/credits/${selected._id}`, { credits, note });
      setSuccess(`${credits > 0 ? '+' : ''}${credits} credits added. New balance: ${res.data.credits}`);
      setSelected((s) => ({ ...s, credits: res.data.credits }));
      setAmount('');
      setNote('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add credits.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Individual User Credits</h3>
      {error && <div className="badge badge-red" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{error}</div>}
      {success && <div className="badge badge-green" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{success}</div>}

      <div className="form-group">
        <label>Search by name or email</label>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          placeholder={loading ? 'Loading users...' : 'Type a name or email'}
        />
      </div>

      {matches.length > 0 && !selected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          {matches.map((u) => (
            <button
              key={u._id}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start' }}
              onClick={() => { setSelected(u); setQuery(u.name); }}
            >
              {u.name} <span className="text-muted" style={{ marginLeft: 6 }}>({u.role}) — {u.email}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ background: '#F7FAFF', borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>{selected.name}</div>
          <div className="text-muted" style={{ textTransform: 'capitalize' }}>{selected.role}</div>
          <div style={{ marginTop: 6, fontWeight: 700, color: '#2B7FFF' }}>{selected.credits ?? 0} credits</div>

          <div className="grid-2" style={{ marginTop: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Credits to Add</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 10 or -5" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Note (optional)</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason" />
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={saving} onClick={handleAdd}>
            {saving ? 'Saving...' : 'Add Credits'}
          </button>
        </div>
      )}
    </div>
  );
}

function CreditSettingsSection() {
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

  const setPack = (i, field, value) => setSettings((s) => {
    const packs = [...(s.creditPacks || [])];
    packs[i] = { ...packs[i], [field]: value };
    return { ...s, creditPacks: packs };
  });

  const setFeaturedPack = (i, field, value) => setSettings((s) => {
    const packs = [...(s.featuredPacks || [])];
    packs[i] = { ...packs[i], [field]: value };
    return { ...s, featuredPacks: packs };
  });

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await api.put('/api/admin/settings', {
        freeCreditsEnabled: settings.freeCreditsEnabled,
        freeCreditsAmount: settings.freeCreditsAmount,
        customerFreeCredits: settings.customerFreeCredits,
        bookingAcceptCreditCost: settings.bookingAcceptCreditCost,
        jobSelectCreditCost: settings.jobSelectCreditCost,
        emergencyPostCreditCost: settings.emergencyPostCreditCost,
        creditPacks: settings.creditPacks,
        featuredPacks: settings.featuredPacks,
      });
      setSettings(res.data);
      setSuccess('Credit settings saved.');
    } catch (err) {
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <p className="text-muted">Loading credit settings...</p>;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Credit Settings</h3>
      {error && <div className="badge badge-red" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{error}</div>}
      {success && <div className="badge badge-green" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{success}</div>}

      <Toggle
        label="Free Credits Enabled"
        description="Show 'Credits are FREE' banner to users"
        value={!!settings.freeCreditsEnabled}
        onChange={(v) => setField('freeCreditsEnabled', v)}
      />

      <div className="grid-2" style={{ marginTop: 12 }}>
        <div className="form-group">
          <label>Professional Starter Credits</label>
          <input type="number" min="0" value={settings.freeCreditsAmount ?? 0} onChange={(e) => setField('freeCreditsAmount', Number(e.target.value))} />
        </div>
        <div className="form-group">
          <label>Customer Starter Credits</label>
          <input type="number" min="0" value={settings.customerFreeCredits ?? 0} onChange={(e) => setField('customerFreeCredits', Number(e.target.value))} />
        </div>
      </div>

      <div className="grid-3">
        <div className="form-group">
          <label>Booking Accept Cost</label>
          <input type="number" min="0" value={settings.bookingAcceptCreditCost ?? 1} onChange={(e) => setField('bookingAcceptCreditCost', Number(e.target.value))} />
        </div>
        <div className="form-group">
          <label>Job Selection Cost</label>
          <input type="number" min="0" value={settings.jobSelectCreditCost ?? 1} onChange={(e) => setField('jobSelectCreditCost', Number(e.target.value))} />
        </div>
        <div className="form-group">
          <label>Emergency Post Cost</label>
          <input type="number" min="0" value={settings.emergencyPostCreditCost ?? 1} onChange={(e) => setField('emergencyPostCreditCost', Number(e.target.value))} />
        </div>
      </div>

      <h4 style={{ margin: '16px 0 10px' }}>Credit Packs</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(settings.creditPacks || []).map((pack, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: '#F7FAFF', padding: 10, borderRadius: 8 }}>
            <span className="text-muted">Pack {i + 1}:</span>
            <input
              type="number" min="0" value={pack.credits ?? 0}
              onChange={(e) => setPack(i, 'credits', Number(e.target.value))}
              style={{ width: 90, padding: '6px 8px' }}
            /> credits |{' '}
            ৳<input
              type="number" min="0" value={pack.priceBDT ?? 0}
              onChange={(e) => setPack(i, 'priceBDT', Number(e.target.value))}
              style={{ width: 90, padding: '6px 8px' }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={!!pack.popular} onChange={(e) => setPack(i, 'popular', e.target.checked)} />
              Popular
            </label>
          </div>
        ))}
      </div>

      <h4 style={{ margin: '16px 0 10px' }}>Featured/Boost Packs</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(settings.featuredPacks || []).map((pack, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: '#FFFBEB', padding: 10, borderRadius: 8 }}>
            <span className="text-muted" style={{ textTransform: 'capitalize' }}>{pack.tier}:</span>
            <input
              type="number" min="1" value={pack.days ?? 0}
              onChange={(e) => setFeaturedPack(i, 'days', Number(e.target.value))}
              style={{ width: 70, padding: '6px 8px' }}
            /> days |{' '}
            ৳<input
              type="number" min="0" value={pack.priceBDT ?? 0}
              onChange={(e) => setFeaturedPack(i, 'priceBDT', Number(e.target.value))}
              style={{ width: 90, padding: '6px 8px' }}
            /> |{' '}
            <input
              type="text" value={pack.label ?? ''}
              onChange={(e) => setFeaturedPack(i, 'label', e.target.value)}
              style={{ width: 160, padding: '6px 8px' }}
              placeholder="Label"
            />
          </div>
        ))}
      </div>

      <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={saving} onClick={handleSave}>
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

function CreditsTab() {
  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Credits & Payments</h2>
      <PaymentGatewaySection />
      <ManualTopUpSection />
      <RenewAllSection />
      <IndividualCreditsSection />
      <CreditSettingsSection />
      <FeaturedRequestsSection />
      <ManualFeatureSection />
      <ActiveFeaturedSection />
    </div>
  );
}

function FeaturedRequestsSection() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAll = useCallback(() => {
    setLoading(true);
    api.get('/api/admin/featured-requests')
      .then((res) => setRequests(res.data || []))
      .catch(() => setError('Failed to load boost requests'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleApprove = async (id) => {
    setBusyId(id); setError(''); setSuccess('');
    try {
      await api.put(`/api/admin/featured-requests/${id}/approve`);
      setSuccess('Boost approved.');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id) => {
    setBusyId(id); setError(''); setSuccess('');
    try {
      await api.put(`/api/admin/featured-requests/${id}/reject`, { reason: rejectReason || 'Could not verify transaction' });
      setSuccess('Boost rejected.');
      setRejectingId(null);
      setRejectReason('');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p className="text-muted">Loading boost requests...</p>;

  const sortedOldestFirst = [...requests].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>⭐ Featured/Boost Requests</h3>
        <span className="badge badge-yellow">{sortedOldestFirst.length} pending</span>
      </div>
      {error && <div className="badge badge-red" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{error}</div>}
      {success && <div className="badge badge-green" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{success}</div>}

      {sortedOldestFirst.length === 0 ? (
        <p className="text-muted">No pending boost requests.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th><th>Tier</th><th>Days</th><th>Amount</th><th>Method</th><th>TRX ID</th><th>Submitted</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedOldestFirst.map((r) => (
                <tr key={r._id}>
                  <td>{r.user?.name || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.tier}</td>
                  <td>{r.days}</td>
                  <td>{formatBDT(r.amountBDT)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.method}</td>
                  <td>{r.transactionID}</td>
                  <td>{new Date(r.createdAt).toLocaleString('en-BD')}</td>
                  <td>
                    {rejectingId === r._id ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Reason"
                          style={{ width: 120, padding: '4px 8px', fontSize: 12 }}
                        />
                        <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 12 }} disabled={busyId === r._id} onClick={() => handleReject(r._id)}>Confirm</button>
                        <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setRejectingId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-success" style={{ padding: '4px 8px', fontSize: 12 }} disabled={busyId === r._id} onClick={() => handleApprove(r._id)}>✓ Approve</button>
                        <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 12 }} disabled={busyId === r._id} onClick={() => { setRejectingId(r._id); setRejectReason(''); }}>✗ Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ManualFeatureSection() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [days, setDays] = useState(30);
  const [tier, setTier] = useState('premium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/api/admin/users')
      .then((res) => setUsers((res.data || []).filter((u) => u.role === 'professional')))
      .catch(() => setError('Failed to load professionals'))
      .finally(() => setLoading(false));
  }, []);

  const matches = query.trim().length === 0 ? [] : users.filter((u) =>
    u.name?.toLowerCase().includes(query.toLowerCase()) || u.email?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  const handleSetFeatured = async (featured) => {
    setError(''); setSuccess('');
    setSaving(true);
    try {
      const res = await api.put(`/api/admin/users/${selected._id}/set-featured`, { featured, days: Number(days), tier });
      setSuccess(featured ? `${res.data.user.name} is now Featured.` : `${res.data.user.name} is no longer Featured.`);
      setSelected(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Manually Feature a Professional</h3>
      {error && <div className="badge badge-red" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{error}</div>}
      {success && <div className="badge badge-green" style={{ display: 'block', marginBottom: 12, padding: '8px 12px' }}>{success}</div>}

      <div className="form-group">
        <label>Search professional by name or email</label>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          placeholder={loading ? 'Loading professionals...' : 'Type a name or email'}
        />
      </div>

      {matches.length > 0 && !selected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          {matches.map((u) => (
            <button
              key={u._id}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start' }}
              onClick={() => { setSelected(u); setQuery(u.name); }}
            >
              {u.name} <span className="text-muted" style={{ marginLeft: 6 }}>— {u.email}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ background: '#F7FAFF', borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>{selected.name}</div>
          <div className="text-muted">{selected.email}</div>
          <div style={{ marginTop: 6 }}>
            {selected.isFeatured ? (
              <span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>
                ⭐ Featured until {selected.featuredUntil ? new Date(selected.featuredUntil).toLocaleDateString('en-BD') : '—'}
              </span>
            ) : (
              <span className="badge badge-gray">Not Featured</span>
            )}
          </div>

          <div className="grid-2" style={{ marginTop: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Tier</label>
              <select value={tier} onChange={(e) => setTier(e.target.value)}>
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Days</label>
              <input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" disabled={saving} onClick={() => handleSetFeatured(true)}>
              {saving ? 'Saving...' : '⭐ Feature Now'}
            </button>
            <button className="btn btn-outline" disabled={saving} onClick={() => handleSetFeatured(false)}>
              Remove Featured
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActiveFeaturedSection() {
  const [pros, setPros] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/featured-requests/active')
      .then((res) => setPros(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading featured professionals...</p>;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Currently Featured Professionals</h3>
      {pros.length === 0 ? (
        <p className="text-muted">No professionals are currently featured.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Type</th><th>Tier</th><th>Featured Until</th></tr>
            </thead>
            <tbody>
              {pros.map((p) => (
                <tr key={p._id}>
                  <td>{p.name}</td>
                  <td>{p.email}</td>
                  <td>{p.professionalType}</td>
                  <td style={{ textTransform: 'capitalize' }}>{p.featuredTier}</td>
                  <td>{new Date(p.featuredUntil).toLocaleDateString('en-BD')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
        maintenanceMessage: settings.maintenanceMessage,
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
        <p className="text-muted" style={{ marginBottom: 12 }}>
          bKash/Nagad numbers and credit pack pricing are managed in the Credits tab.
        </p>
        <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <GodModeSection settings={settings} handleToggle={handleToggle} setField={setField} handleSave={handleSave} saving={saving} />
    </div>
  );
}

function GodModeSection({ settings, handleToggle, setField, handleSave, saving }) {
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastState, setBroadcastState] = useState('idle'); // idle | sending | success | error
  const [broadcastResult, setBroadcastResult] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    setBroadcastState('sending'); setBroadcastResult('');
    try {
      const res = await api.post('/api/admin/broadcast', { message: broadcastMessage.trim() });
      setBroadcastState('success');
      setBroadcastResult('Sent to ' + res.data.recipientCount + ' users.');
      setBroadcastMessage('');
      setTimeout(() => setBroadcastState('idle'), 3000);
    } catch (err) {
      setBroadcastState('error');
      setBroadcastResult(err.response?.data?.error || 'Failed to send broadcast.');
      setTimeout(() => setBroadcastState('idle'), 3000);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true); setExportError('');
    try {
      const res = await api.get('/api/admin/export-users-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'carely-users-' + Date.now() + '.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError('Failed to export users.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 16, border: '1.5px solid #FCA5A5' }}>
      <h3 style={{ marginBottom: 4, color: '#991B1B' }}>⚡ God Mode</h3>
      <p className="text-muted" style={{ marginBottom: 16 }}>Master controls - use with care, these affect every user immediately.</p>

      <Toggle
        label="Pause New Registrations"
        description="Block anyone from signing up (existing users are unaffected)"
        value={!!settings.registrationsPaused}
        onChange={(v) => handleToggle('registrationsPaused', v)}
      />
      <Toggle
        label="Maintenance Mode"
        description="Show a maintenance page to all customers/professionals; admin login still works"
        value={!!settings.maintenanceMode}
        onChange={(v) => handleToggle('maintenanceMode', v)}
      />

      <div className="form-group" style={{ marginTop: 12 }}>
        <label>Maintenance Message</label>
        <textarea
          rows={2}
          value={settings.maintenanceMessage || ''}
          onChange={(e) => setField('maintenanceMessage', e.target.value)}
        />
        <button className="btn btn-secondary" style={{ marginTop: 8 }} disabled={saving} onClick={handleSave}>
          {saving ? 'Saving...' : 'Save Message'}
        </button>
      </div>

      <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 16, paddingTop: 16 }}>
        <label className="form-label">Broadcast Notification to All Users</label>
        <textarea
          rows={2}
          value={broadcastMessage}
          onChange={(e) => setBroadcastMessage(e.target.value)}
          placeholder="e.g. Carely will be down for maintenance tonight from 11pm-12am."
        />
        {broadcastResult && (
          <div className={broadcastState === 'error' ? 'msg-error' : 'msg-success'} style={{ marginTop: 8 }}>{broadcastResult}</div>
        )}
        <button
          className="btn btn-primary"
          style={{ marginTop: 8 }}
          disabled={broadcastState === 'sending' || !broadcastMessage.trim()}
          onClick={handleBroadcast}
        >
          {broadcastState === 'sending' ? 'Sending...' : 'Send Broadcast'}
        </button>
      </div>

      <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 16, paddingTop: 16 }}>
        <label className="form-label">Export All Users</label>
        <p className="text-muted" style={{ marginBottom: 8 }}>Download a CSV of every user (name, email, phone, role, credits, verification status).</p>
        {exportError && <div className="msg-error" style={{ marginBottom: 8 }}>{exportError}</div>}
        <button className="btn btn-secondary" disabled={exporting} onClick={handleExportCsv}>
          {exporting ? 'Exporting...' : '⬇ Export Users (CSV)'}
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
