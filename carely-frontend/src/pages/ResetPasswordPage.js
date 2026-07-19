import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';

const strengthOf = (pw) => {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (score <= 2) return { label: 'Weak', color: '#DC2626' };
  if (score <= 3) return { label: 'Okay', color: '#D97706' };
  return { label: 'Strong', color: '#16A34A' };
};

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const missingParams = !token || !email;
  const strength = strengthOf(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { email, token, newPassword: password });
      setSuccess('Your password has been reset. Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'This reset link is invalid or has expired. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div className="app-page-content" style={{ maxWidth: 420, margin: '0 auto', padding: '28px 20px' }}>
      <div className="card">
        <h2 style={{ marginBottom: 20, textAlign: 'center' }}>Reset Password</h2>

        {missingParams ? (
          <>
            <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>
              This reset link is invalid or has expired. Please request a new one.
            </div>
            <Link to="/forgot-password" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', width: '100%' }}>
              Request a new link
            </Link>
          </>
        ) : (
          <>
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
                  <label>New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    style={{ fontSize: 16 }}
                    required
                  />
                  {strength && (
                    <div style={{ fontSize: 12, color: strength.color, fontWeight: 700, marginTop: 4 }}>
                      Strength: {strength.label}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    style={{ fontSize: 16 }}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}
          </>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/login" className="text-green">Back to login</Link>
        </div>
      </div>
      </div>
    </div>
  );
}
