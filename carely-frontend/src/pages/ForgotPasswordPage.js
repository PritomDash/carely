import React, { useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSuccess('Check your email for a link to reset your password.');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '28px 20px' }}>
      <div className="card">
        <h2 style={{ marginBottom: 20, textAlign: 'center' }}>Forgot Password</h2>
        <p className="text-muted" style={{ marginBottom: 20, textAlign: 'center' }}>
          Enter your email and we'll send you a link to reset your password.
        </p>

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
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/login" className="text-green">Back to login</Link>
        </div>
      </div>
      </div>
    </div>
  );
}
