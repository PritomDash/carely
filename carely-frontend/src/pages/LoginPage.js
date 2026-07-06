import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { handleGoogleLogin } from '../utils/googleAuth';
import CarelyLogo from '../components/CarelyLogo';

const inputStyle = {
  width: '100%', padding: '14px 16px',
  border: '1.5px solid #E2E8F0', borderRadius: 10,
  fontSize: 15, outline: 'none',
  transition: 'border 0.2s',
  marginBottom: 16,
};

export default function LoginPage() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [success] = useState(routerLocation.state?.success || '');
  const [submitState, setSubmitState] = useState('idle'); // idle | submitting | success | error

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'google_failed') {
      setError('Google login failed. Please try again or use email.');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitState('submitting');
    try {
      const url = isAdmin ? '/api/admin/login' : '/api/auth/login';
      const res = await api.post(url, { email, password });
      const { token } = res.data;
      const loggedUser = res.data.user || res.data.admin;

      localStorage.setItem('carelyToken', token);
      localStorage.setItem('carelyUser', JSON.stringify(loggedUser));
      window.dispatchEvent(new Event('carely-auth-changed'));

      setSubmitState('success');
      if (loggedUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setSubmitState('error');
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      setTimeout(() => setSubmitState('idle'), 3000);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>

      {/* LEFT SIDE - Photo and branding */}
      <div className="auth-left-panel" style={{
        flex: 1, position: 'relative', display: 'flex',
        flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', padding: '60px 48px',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #2563EB 100%)',
        overflow: 'hidden',
      }}>
        {/* Background photo */}
        <img
          src="https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&q=80"
          alt="Care professional"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2 }}
        />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 48 }}>
            <CarelyLogo size={36} white={true} />
            <span style={{ fontSize: 28, fontWeight: 900, color: '#FFFFFF' }}>Carely</span>
          </a>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: '#FFFFFF', marginBottom: 16, lineHeight: 1.2 }}>
            Welcome Back to Bangladesh's Care Marketplace
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, marginBottom: 40 }}>
            Connect with verified child care, aged care, nursing, and physiotherapy professionals near you.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              '✓ Verified care professionals',
              '✓ Available across all 64 districts',
              '✓ Book in minutes',
              '✓ Free for customers',
            ].map(f => (
              <div key={f} style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, textAlign: 'left' }}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Login form */}
      <div className="auth-right-panel" style={{
        width: 480, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 48px',
        background: '#FFFFFF', overflowY: 'auto',
      }}>
        <div className="auth-mobile-logo-wrap" style={{ display: 'none', textAlign: 'center', marginBottom: 28 }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <CarelyLogo size={36} />
            <span style={{ fontSize: 22, fontWeight: 900, color: '#1A1A2E' }}>Carely</span>
          </a>
        </div>

        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#1A1A2E', marginBottom: 8 }}>Sign In</h1>
          <p style={{ fontSize: 15, color: '#64748B' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>Create one free</Link>
          </p>
        </div>

        {error && <div className="msg-error">{error}</div>}
        {success && <div className="msg-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div>
            <label className="form-label">Email</label>
            <input
              className="auth-input"
              style={inputStyle}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div style={{ position: 'relative' }}>
            <label className="form-label">Password</label>
            <input
              className="auth-input"
              style={{ ...inputStyle, paddingRight: 60 }}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted"
              style={{
                position: 'absolute', right: 10, top: 34, transform: 'translateY(0)',
                background: 'none', border: 'none', fontSize: 13, fontWeight: 500
              }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                style={{ width: 'auto' }}
              />
              Admin Login
            </label>
            <Link to="/forgot-password" style={{ color: '#2563EB', fontSize: 13, textDecoration: 'none' }}>Forgot password?</Link>
          </div>

          <button
            type="submit"
            disabled={submitState === 'submitting' || submitState === 'success'}
            style={{
              width: '100%', padding: 16,
              background: submitState === 'success' ? '#22C55E' : 'linear-gradient(135deg, #2563EB, #3B82F6)',
              color: 'white', border: 'none', borderRadius: 12,
              fontSize: 16, fontWeight: 800,
              cursor: submitState === 'idle' ? 'pointer' : 'not-allowed',
              boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
              marginTop: 8, opacity: submitState === 'submitting' ? 0.7 : 1,
            }}
          >
            {submitState === 'submitting' && '⏳ Signing in...'}
            {submitState === 'success' && '✓ Signed In!'}
            {submitState === 'error' && 'Try Again'}
            {submitState === 'idle' && 'Sign In'}
          </button>
        </form>

        <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          <span style={{ color: '#94A3B8', fontSize: 13 }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
        </div>

        <button
          type="button"
          onClick={() => handleGoogleLogin(navigate, setError)}
          style={{
            width: '100%',
            padding: '13px 16px',
            background: 'white',
            border: '1.5px solid #E2E8F0',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            color: '#374151',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            transition: 'box-shadow 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            style={{ width: 20, height: 20 }}
          />
          Continue with Google
        </button>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <span className="text-muted">
            Don't have an account? <Link to="/register" style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>Sign up →</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
