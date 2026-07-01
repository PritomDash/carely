import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/admin/login', { email, password });
      const { token, admin } = res.data;

      localStorage.setItem('carelyToken', token);
      localStorage.setItem('adminToken', token);
      localStorage.setItem('carelyUser', JSON.stringify(admin));

      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Admin login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 420 }}>
      <div className="card">
        <h2 style={{ marginBottom: 20, textAlign: 'center' }}>Admin Login</h2>

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
              placeholder="admin@carely.com"
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
                placeholder="Admin password"
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

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/login" className="text-muted">Not an admin? Log in here</Link>
        </div>
      </div>
    </div>
  );
}
