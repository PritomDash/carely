import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      } else if (loggedUser.role === 'professional') {
        navigate('/professional-profile');
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
        <h2 style={{ marginBottom: 20, textAlign: 'center' }}>Log In</h2>

        {error && (
          <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>
            {error}
          </div>
        )}

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
            <label htmlFor="isAdmin" style={{ margin: 0 }}>Login as admin</label>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link to="/forgot-password" className="text-muted">Forgot password?</Link>
          <span className="text-muted">
            Don't have an account? <Link to="/register" className="text-green">Register</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
