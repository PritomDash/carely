import React, { useState, useEffect } from 'react';
import api, { API_BASE } from '../services/api';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
  </svg>
);

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== API_BASE) return;
      if (event.data?.token) {
        localStorage.setItem('carelyToken', event.data.token);
        localStorage.setItem('carelyUser', JSON.stringify(event.data.user));
        navigate('/home');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  const handleGoogleLogin = () => {
    window.open(`${API_BASE}/api/auth/google`, 'google-login', 'width=500,height=600');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = isAdmin ? '/api/admin/login' : '/api/auth/login';
      const res = await api.post(url, { email, password });
      const { token } = res.data;
      const loggedUser = res.data.user || res.data.admin;

      localStorage.setItem('carelyToken', token);
      localStorage.setItem('carelyUser', JSON.stringify(loggedUser));

      if (loggedUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
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
            <span style={{ fontSize: 36 }}>💙</span>
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
        <a href="/" className="auth-mobile-logo" style={{ display: 'none', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 32 }}>
          <span style={{ fontSize: 30 }}>💙</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#1A1A2E' }}>Carely</span>
        </a>

        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#1A1A2E', marginBottom: 8 }}>Sign In</h1>
          <p style={{ fontSize: 15, color: '#64748B' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>Create one free</Link>
          </p>
        </div>

        {error && <div className="msg-error">{error}</div>}
        {success && <div className="msg-success">{success}</div>}

        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            width: '100%', padding: 14,
            background: 'white', border: '1.5px solid #E2E8F0',
            borderRadius: 12, fontSize: 15, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 10, color: '#374151',
            marginTop: 12,
          }}
        >
          <GoogleIcon /> Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#E8EDF3' }} />
          <span className="text-muted">or</span>
          <div style={{ flex: 1, height: 1, background: '#E8EDF3' }} />
        </div>

        <form onSubmit={handleSubmit}>
          <div>
            <label className="form-label">Email</label>
            <input
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
            disabled={loading}
            style={{
              width: '100%', padding: 16,
              background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
              color: 'white', border: 'none', borderRadius: 12,
              fontSize: 16, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
              marginTop: 8, opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <span className="text-muted">
            Don't have an account? <Link to="/register" style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>Sign up →</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
