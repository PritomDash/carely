import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';

const TYPE_ICON = {
  booking: '📋',
  chat: '💬',
  payment: '💰',
  admin: '🛡️',
  reminder: '⏰',
  jobpost: '📢',
  dispute: '⚠️',
};

const timeAgo = (dateStr) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + (minutes === 1 ? ' minute ago' : ' minutes ago');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
  const days = Math.floor(hours / 24);
  if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
  const months = Math.floor(days / 30);
  if (months < 12) return months + (months === 1 ? ' month ago' : ' months ago');
  const years = Math.floor(months / 12);
  return years + (years === 1 ? ' year ago' : ' years ago');
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = () => {
    setLoading(true);
    api.get('/api/notifications')
      .then((res) => setNotifications(res.data.notifications || []))
      .catch(() => setError('Failed to load notifications'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleClick = async (n) => {
    if (!n.isRead) {
      setNotifications((prev) => prev.map((x) => x._id === n._id ? { ...x, isRead: true } : x));
      api.put(`/api/notifications/${n._id}/read`).catch(() => {});
    }
    navigate(n.link || '/my-bookings');
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((x) => x._id !== id));
    api.delete(`/api/notifications/${id}`).catch(() => {});
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
    api.put('/api/notifications/mark-all-read').catch(() => {});
  };

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const hasUnread = sorted.some((n) => !n.isRead);

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div className="app-page-content" style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ margin: 0 }}>Notifications</h2>
          {hasUnread && (
            <button className="btn btn-secondary" onClick={handleMarkAllRead}>Mark all as read</button>
          )}
        </div>

        {error && (
          <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>
        )}

        {loading ? (
          <p className="text-muted">Loading notifications...</p>
        ) : sorted.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p className="text-muted">No notifications yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sorted.map((n) => (
              <div
                key={n._id}
                className="card"
                onClick={() => handleClick(n)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
                  background: n.isRead ? '#fff' : '#F5F9FF',
                }}
              >
                <div style={{ fontSize: 22, flexShrink: 0 }}>{TYPE_ICON[n.type] || '🔔'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {!n.isRead && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2B7FFF', flexShrink: 0 }} />
                    )}
                    <span style={{ fontWeight: n.isRead ? 500 : 700, color: '#1A1A2E' }}>{n.message}</span>
                  </div>
                  <div className="text-muted" style={{ marginTop: 4, fontSize: 12 }}>{timeAgo(n.createdAt)}</div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, n._id)}
                  style={{
                    background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer',
                    fontSize: 16, padding: 4, flexShrink: 0,
                  }}
                  aria-label="Delete notification"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
