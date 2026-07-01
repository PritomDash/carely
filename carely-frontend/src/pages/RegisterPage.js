import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/api/auth/register', { name, email, password, phone, role });
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 420 }}>
      <div className="card">
        <h2 style={{ marginBottom: 20, textAlign: 'center' }}>Create Account</h2>

        {error && (
          <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="badge badge-green" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>

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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password"
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              required
            />
          </div>

          <div className="form-group">
            <label>I am a</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} required>
              <option value="customer">Customer</option>
              <option value="professional">Professional</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <span className="text-muted">
            Already have an account? <Link to="/login" className="text-green">Log in</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
