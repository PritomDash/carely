import React, { useState, useEffect, useRef, useCallback } from 'react';
import api, { API_BASE } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import socket from '../socket';
import AppNavbar from '../components/AppNavbar';

const fileUrl = (p) => {
  if (!p) return null;
  const name = String(p).split(/[\\/]/).pop();
  return `${API_BASE}/uploads/documents/${name}`;
};

const formatTime = (d) => new Date(d).toLocaleString('en-BD', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { otherUserId } = useParams();

  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      api.get(`/api/chat/${otherUserId}`),
      api.get(`/api/users/${otherUserId}`),
    ]).then(([msgRes, userRes]) => {
      setMessages(msgRes.data || []);
      setOtherUser(userRes.data);
    }).catch(() => setError('Failed to load conversation'))
      .finally(() => setLoading(false));
  }, [otherUserId, user]);

  useEffect(() => {
    if (!user || !otherUserId) return;
    const room = [String(user._id), String(otherUserId)].sort().join('_');
    socket.emit('joinThread', room);

    const handleReceive = (msg) => {
      const involvesThread =
        (String(msg.sender) === String(user._id) && String(msg.recipient) === String(otherUserId)) ||
        (String(msg.sender) === String(otherUserId) && String(msg.recipient) === String(user._id));
      if (involvesThread) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('receiveMessage', handleReceive);
    return () => socket.off('receiveMessage', handleReceive);
  }, [user, otherUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await api.post('/api/chat/send', { recipient: otherUserId, message: text.trim() });
      setMessages((prev) => [...prev, res.data]);
      setText('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <p className="text-muted">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px' }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '70vh', padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
            {otherUser?.profilePhoto && (
              <img src={fileUrl(otherUser.profilePhoto)} alt={otherUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
          <strong>{otherUser?.name || 'Conversation'}</strong>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', marginTop: 20 }}>No messages yet. Say hello!</p>
          ) : (
            messages.map((m) => {
              const isMine = String(m.sender) === String(user._id);
              return (
                <div key={m._id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '75%', padding: '8px 12px', borderRadius: 12,
                    background: isMine ? 'var(--primary)' : '#f3f4f6',
                    color: isMine ? '#fff' : '#111827',
                  }}>
                    <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 2 }}>
                      {isMine ? 'You' : (otherUser?.name || 'Them')}
                    </div>
                    <div>{m.message}</div>
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
                      {formatTime(m.createdAt || m.sentAt)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="badge badge-red" style={{ display: 'block', margin: '0 16px 8px', padding: '6px 10px' }}>{error}</div>
        )}

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
      </div>

      <div style={{ marginTop: 16 }}>
        <Link to="/chat-inbox" className="text-muted">Back to Inbox</Link>
      </div>
      </div>
    </div>
  );
}
