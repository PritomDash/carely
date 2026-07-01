import React, { useState, useEffect } from 'react';
import api, { API_BASE } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';

// Login with email/password, admin toggle
// TODO: Full implementation via Claude Code

export default function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <h2>LoginPage</h2>
        <p className="text-muted" style={{ marginTop: 8 }}>
          Login with email/password, admin toggle
        </p>
        <p style={{ marginTop: 20, color: '#16a34a' }}>
          ✅ Route registered — implement with Claude Code
        </p>
        <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/" className="btn btn-secondary">Home</Link>
          <Link to="/login" className="btn btn-primary">Login</Link>
        </div>
      </div>
    </div>
  );
}
