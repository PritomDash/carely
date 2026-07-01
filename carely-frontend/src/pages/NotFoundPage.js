import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="page" style={{ maxWidth: 420 }}>
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <h2 style={{ fontSize: 48, color: '#16a34a', marginBottom: 8 }}>404</h2>
        <p className="text-muted" style={{ marginBottom: 24 }}>
          The page you're looking for doesn't exist.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Go Home
        </button>
      </div>
    </div>
  );
}
