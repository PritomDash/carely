import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import socket from '../socket';

const TYPE_ICON = {
  booking: '📋',
  chat: '💬',
  payment: '💰',
  admin: '🛡️',
  reminder: '⏰',
  jobpost: '📢',
  dispute: '⚠️',
};
const TYPE_BG = {
  booking: '#EBF5FF',
  chat: '#F0FDF4',
  payment: '#FEF3C7',
  admin: '#FEE2E2',
  reminder: '#F3E8FF',
  jobpost: '#FFF7ED',
  dispute: '#FEE2E2',
};

const timeAgo = (dateStr) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + 'm ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days < 30) return days + 'd ago';
  const months = Math.floor(days / 30);
  if (months < 12) return months + 'mo ago';
  return Math.floor(months / 12) + 'y ago';
};

const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (e) { /* audio not available */ }
};

function NotificationRow({ n, onClick }) {
  return (
    <div
      onClick={() => onClick(n)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
        cursor: 'pointer', background: n.isRead ? '#fff' : '#F5F9FF',
        borderBottom: '1px solid #F1F5F9',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: TYPE_BG[n.type] || '#F1F5F9',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
      }}>
        {TYPE_ICON[n.type] || '🔔'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          {!n.isRead && (
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2B7FFF', flexShrink: 0, marginTop: 5 }} />
          )}
          <span style={{
            fontSize: 13, fontWeight: n.isRead ? 500 : 700, color: '#1A1A2E',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {n.message}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>{timeAgo(n.createdAt)}</div>
      </div>
    </div>
  );
}

function NotificationPanel({ items, loaded, onRowClick, onMarkAllRead, onSeeAll, onClose, isMobile }) {
  const hasUnread = items.some((n) => !n.isRead);
  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid #F1F5F9', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>Notifications</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {hasUnread && (
            <button
              onClick={onMarkAllRead}
              style={{ background: 'none', border: 'none', color: '#2B7FFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              Mark all read
            </button>
          )}
          {isMobile && (
            <button
              onClick={onClose}
              aria-label="Close notifications"
              style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {!loaded ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Loading...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>🔔</div>
            <div style={{ color: '#94A3B8', fontSize: 13 }}>No notifications yet</div>
          </div>
        ) : (
          items.map((n) => <NotificationRow key={n._id} n={n} onClick={onRowClick} />)
        )}
      </div>

      <div
        onClick={onSeeAll}
        style={{
          padding: '12px 16px', textAlign: 'center', cursor: 'pointer', flexShrink: 0,
          borderTop: '1px solid #F1F5F9', color: '#2B7FFF', fontSize: 13, fontWeight: 700,
        }}
      >
        See all notifications
      </div>
    </>
  );
}

// Self-contained: owns its own unread count, dropdown/sheet open state, and
// list fetch, so AppNavbar just renders <NotificationBell userId={user._id} />
// instead of tracking notification state itself. Desktop gets a dropdown
// anchored under the bell; mobile (<768px) gets a full-width slide-down
// sheet - neither ever navigates away from the current page just to check
// notifications, matching the "don't lose your place" spec.
export default function NotificationBell({ userId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const wrapRef = useRef(null);
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    if (!userId) return;
    api.get('/api/notifications/count-unread')
      .then((r) => setUnread(r.data.unreadCount || 0))
      .catch(() => {});
  }, [userId, location.pathname]);

  useEffect(() => {
    if (!userId) return;
    socket.emit('joinRoom', userId);
    const handleNew = (n) => {
      setUnread((prev) => prev + 1);
      playNotificationSound();
      setItems((prev) => (open ? [n, ...prev].slice(0, 20) : prev));
    };
    socket.on('newNotification', handleNew);
    return () => socket.off('newNotification', handleNew);
  }, [userId, open]);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  // The mobile bottom-nav bar has its own "Alerts" tab (a second bell icon)
  // that used to navigate straight to /notifications - it now dispatches
  // this event instead so tapping it opens the same panel in place, rather
  // than the bell being the only entry point that doesn't navigate away.
  useEffect(() => {
    const handleExternalOpen = () => {
      setOpen(true);
      loadList();
    };
    window.addEventListener('carely-open-notifications', handleExternalOpen);
    return () => window.removeEventListener('carely-open-notifications', handleExternalOpen);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const loadList = useCallback(() => {
    setLoaded(false);
    api.get('/api/notifications')
      .then((r) => setItems((r.data.notifications || []).slice(0, 20)))
      .catch(() => setItems([]))
      .finally(() => setLoaded(true));
  }, []);

  const togglePanel = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  const handleRowClick = (n) => {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      setUnread((prev) => Math.max(0, prev - 1));
      api.put(`/api/notifications/${n._id}/read`).catch(() => {});
    }
    setOpen(false);
    navigate(n.link || '/my-bookings');
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
    api.put('/api/notifications/mark-all-read').catch(() => {});
  };

  const handleSeeAll = () => {
    setOpen(false);
    navigate('/notifications');
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div
        onClick={togglePanel}
        role="button"
        aria-label="Notifications"
        style={{ position: 'relative', cursor: 'pointer' }}
      >
        <span style={{ fontSize: 22 }}>🔔</span>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5, background: '#EF4444', color: '#fff',
            borderRadius: '50%', width: 18, height: 18, fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>

      {open && isMobile && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 400 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, maxHeight: '85vh',
              background: '#fff', borderRadius: '0 0 16px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <NotificationPanel
              items={items} loaded={loaded} onRowClick={handleRowClick}
              onMarkAllRead={handleMarkAllRead} onSeeAll={handleSeeAll}
              onClose={() => setOpen(false)} isMobile
            />
          </div>
        </div>
      )}

      {open && !isMobile && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 380, maxHeight: 480,
          background: '#fff', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column', zIndex: 400, border: '1px solid #F1F5F9',
        }}>
          <NotificationPanel
            items={items} loaded={loaded} onRowClick={handleRowClick}
            onMarkAllRead={handleMarkAllRead} onSeeAll={handleSeeAll}
            onClose={() => setOpen(false)} isMobile={false}
          />
        </div>
      )}
    </div>
  );
}
