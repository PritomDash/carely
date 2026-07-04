import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { API_BASE } from '../services/api';
import AppNavbar from '../components/AppNavbar';

const fileUrl = (p) => {
  if (!p) return null;
  const name = String(p).split(/[\\/]/).pop();
  return `${API_BASE}/uploads/documents/${name}`;
};

const getInitials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

export default function ReferralPage() {
  const { code } = useParams();
  const [pro, setPro] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (code) {
      // The frontend (Vercel) and backend (Render) are different origins, so a
      // cookie set here can never reach the backend. Store it same-origin in
      // localStorage instead and have RegisterPage.js send it explicitly.
      localStorage.setItem('carelyReferralCode', code);
    }
  }, [code]);

  useEffect(() => {
    api.get('/api/users/professionals')
      .then((res) => {
        const match = (res.data || []).find((p) => p.referralCode === code);
        setPro(match || null);
      })
      .catch(() => setPro(null))
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 20px 60px' }}>
        <div style={{
          background: '#fff', maxWidth: 480, margin: '0 auto', borderRadius: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.10)', padding: 40, textAlign: 'center'
        }}>
          {!loading && pro && (
            <>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
                background: 'linear-gradient(135deg,#2B7FFF,#60A5FA)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 28, overflow: 'hidden'
              }}>
                {pro.profilePhoto ? (
                  <img src={fileUrl(pro.profilePhoto)} alt={pro.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  getInitials(pro.name)
                )}
              </div>
              <div style={{ color: '#64748B', fontSize: 13, marginBottom: 4 }}>You were invited by</div>
              <div style={{ fontWeight: 700, fontSize: 24, color: '#1A1A2E', marginBottom: 8 }}>{pro.name}</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <span className="badge badge-blue">{pro.professionalType}</span>
                {pro.rating > 0 && (
                  <span style={{ fontSize: 13, color: '#F59E0B', fontWeight: 600 }}>⭐ {pro.rating.toFixed(1)}</span>
                )}
              </div>
              <div style={{ borderTop: '1px solid #E8EDF3', margin: '16px 0' }} />
            </>
          )}

          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1A1A2E', marginBottom: 8 }}>Join Carely Bangladesh</h1>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 28, lineHeight: 1.6 }}>
            Bangladesh's most trusted care marketplace for Child Care, Aged Care, Nursing, and Physiotherapy
          </p>

          <Link
            to="/register"
            style={{
              display: 'block', width: '100%', padding: '14px 0', background: '#2B7FFF', color: '#fff',
              borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: 'none', boxSizing: 'border-box'
            }}
          >
            Create Free Account
          </Link>

          <div style={{ marginTop: 16, fontSize: 13, color: '#64748B' }}>
            Already have an account? <Link to="/login" className="text-primary" style={{ fontWeight: 600 }}>Sign In</Link>
          </div>

          {!loading && pro && (
            <div style={{
              marginTop: 24, background: '#EBF3FF', border: '1px solid #BFDBFE', borderRadius: 10,
              padding: '12px 16px', fontSize: 13, color: '#1E40AF', textAlign: 'left'
            }}>
              By joining through {pro.name}'s link you will help boost their profile ranking
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
          {['✓ Free to join', '✓ Verified professionals', '✓ Book with confidence'].map((label) => (
            <span key={label} className="trust-pill">{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
