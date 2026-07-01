import React, { useState, useEffect } from 'react';
import api, { API_BASE } from '../services/api';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
  </svg>
);

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
    <div className="page" style={{ maxWidth: 420 }}>
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Link to="/" className="nav-logo" style={{ justifyContent: 'center', fontSize: 22 }}>
            <Heart size={24} color="#1E40AF" fill="#1E40AF" /> Carely
          </Link>
        </div>
        <h2 style={{ marginBottom: 20, textAlign: 'center' }}>Welcome Back</h2>

        {error && (
          <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '10px 14px' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="badge badge-green" style={{ display: 'block', marginBottom: 16, padding: '10px 14px' }}>
            {success}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="btn btn-block"
          style={{ background: '#fff', border: '1px solid #E2E8F0', color: '#0F172A', gap: 10, marginBottom: 20 }}
        >
          <GoogleIcon /> Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          <span className="text-muted">or</span>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                style={{ paddingRight: 60 }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted"
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', fontSize: 13, fontWeight: 500
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="isAdmin"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <label htmlFor="isAdmin" style={{ margin: 0 }}>Admin Login</label>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link to="/forgot-password" className="text-muted">Forgot password?</Link>
          <span className="text-muted">
            Don't have an account? <Link to="/register" className="text-primary">Register</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
