import React, { useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';

// Always the same wording regardless of whether the email was actually
// registered - the backend itself returns an identical neutral response
// either way, so there is nothing else this page could truthfully say.
const NEUTRAL_MESSAGE = "If an account exists for that email, we've sent a reset link. Please check your inbox and spam folder.";

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
      setSuccess(NEUTRAL_MESSAGE);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div className="app-page-content" style={{ maxWidth: 420, margin: '0 auto', padding: '28px 20px' }}>
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

        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ fontSize: 16 }}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/login" className="text-green">Back to login</Link>
        </div>
      </div>
      </div>
    </div>
  );
}
