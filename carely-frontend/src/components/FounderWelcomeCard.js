import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Placeholder until the founder shares a real profile link.
const FOUNDER_FACEBOOK_URL = 'https://facebook.com/YOUR_PROFILE';

const dismissedKey = (userId) => `carelyFounderCardDismissed_${userId}`;

// Shown to professionals only (never customers) - see HomePage. Dismissal
// is remembered per account (localStorage, this is the real app, no backend
// field needed for a UI preference like this) but a small "About the
// founder" link stays behind so it's never permanently lost.
export default function FounderWelcomeCard({ prominent = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const storageKey = user?._id ? dismissedKey(user._id) : null;

  const [dismissed, setDismissed] = useState(() =>
    storageKey ? localStorage.getItem(storageKey) === '1' : false
  );
  const [reopened, setReopened] = useState(false);

  if (!user || user.role !== 'professional') return null;

  const handleDismiss = () => {
    if (reopened) {
      setReopened(false);
      return;
    }
    setDismissed(true);
    if (storageKey) localStorage.setItem(storageKey, '1');
  };

  if (dismissed && !reopened) {
    return (
      <button
        onClick={() => setReopened(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#2563EB', fontSize: 13, fontWeight: 600,
          padding: '4px 0', margin: '0 0 12px',
        }}
      >
        💙 About the founder
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #EFF6FF 0%, #F5F9FF 100%)',
        border: '1px solid #DBEAFE',
        borderRadius: 18,
        padding: prominent ? '28px 24px' : '20px 20px',
        marginBottom: 20,
        boxShadow: '0 4px 16px rgba(37,99,235,0.08)',
      }}
    >
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          position: 'absolute', top: 14, right: 14,
          width: 28, height: 28, borderRadius: '50%',
          background: 'rgba(255,255,255,0.8)', border: '1px solid #DBEAFE',
          color: '#64748B', fontSize: 15, lineHeight: 1,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ×
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div
          style={{
            flexShrink: 0, width: 48, height: 48, borderRadius: '50%',
            background: '#DBEAFE', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 24,
          }}
        >
          👋
        </div>

        <div style={{ flex: 1, minWidth: 240, paddingRight: 24 }}>
          <h3 style={{ fontSize: prominent ? 19 : 17, fontWeight: 800, color: '#1A1A2E', margin: '4px 0 12px' }}>
            A note from the founder
          </h3>

          <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
            <p style={{ margin: '0 0 12px' }}>
              Hi, I'm Pritom — I built Carely. You're one of our very first professionals, and that
              genuinely means a lot to me.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              Carely is brand new, so it's growing day by day. As more families join, your booking
              requests will start coming in — and as an early member, your profile appears first when
              they search.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              Complete your profile and set your rate now, so you're ready the moment families arrive.
              Early professionals get the head start.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              Any questions? Message me directly — I'm a real person and I'd love to hear from you.
            </p>
            <p style={{ margin: 0, fontWeight: 600, color: '#1A1A2E' }}>
              Thank you for being here early.
              <br />
              — Pritom, Founder of Carely
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            <a
              href={FOUNDER_FACEBOOK_URL}
              target="_blank"
              rel="noreferrer"
              style={{
                background: '#2563EB', color: 'white', textDecoration: 'none',
                padding: '11px 18px', borderRadius: 10, fontSize: 13.5, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              💬 Message the founder on Facebook
            </a>
            <button
              onClick={() => navigate('/edit-profile')}
              style={{
                background: 'white', color: '#2563EB', border: '1.5px solid #BFDBFE',
                padding: '11px 18px', borderRadius: 10, fontSize: 13.5, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Complete your profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
