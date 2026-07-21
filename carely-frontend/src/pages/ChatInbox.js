import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';
import Avatar from '../components/Avatar';

const formatTime = (d) => new Date(d).toLocaleString('en-BD', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function ChatInbox() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    api.get('/api/chat/recent')
      .then((res) => setConversations(res.data || []))
      .catch(() => setError('Failed to load conversations'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div className="app-page-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <p className="text-muted">Loading conversations...</p>
        </div>
      </div>
    );
  }

  const sorted = [...conversations].sort(
    (a, b) => new Date(b.createdAt || b.sentAt) - new Date(a.createdAt || a.sentAt)
  );

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div className="app-page-content" style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px' }}>
      <h2 style={{ marginBottom: 16 }}>Messages</h2>

      {error && (
        <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>
      )}

      {sorted.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="text-muted">No conversations yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((c) => {
            const isMine = String(c.sender) === String(user._id);
            const other = isMine ? c.recipientDetails : c.senderDetails;
            const otherId = isMine ? c.recipient : c.sender;
            const unread = !isMine;

            return (
              <div
                key={c._id}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                onClick={() => navigate(`/chat/${otherId}`)}
              >
                <Avatar user={other} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong>{other?.name || 'Unknown'}</strong>
                    <span className="text-muted" style={{ flexShrink: 0 }}>{formatTime(c.createdAt || c.sentAt)}</span>
                  </div>
                  <div className="text-muted" style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2
                  }}>
                    {isMine ? 'You: ' : ''}{c.message}
                  </div>
                </div>
                {unread && (
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
