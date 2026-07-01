import React from 'react';
import { Link } from 'react-router-dom';
import SafetyDisclaimer from '../components/SafetyDisclaimer';
import { Heart, Baby, HeartHandshake, Stethoscope, Activity } from 'lucide-react';

const SERVICES = [
  { icon: Baby, title: 'Child Care', desc: 'Trusted babysitters and nannies for your children, verified and background-checked.' },
  { icon: HeartHandshake, title: 'Aged Care', desc: 'Compassionate caregivers to support elderly family members at home.' },
  { icon: Stethoscope, title: 'Nurse', desc: 'Qualified nurses for home visits, post-surgery care, and ongoing treatment.' },
  { icon: Activity, title: 'Physiotherapist', desc: 'Licensed physiotherapists for rehabilitation and mobility support at home.' },
];

const STEPS = [
  { title: '1. Search', desc: 'Use filters to find nearby professionals by location and care type' },
  { title: '2. Book', desc: 'Send a booking request to your chosen professional' },
  { title: '3. Confirm', desc: 'Professional accepts and contacts you directly to arrange meeting' },
];

const TRUST_PILLS = [
  '✓ Verified Profiles',
  '🔒 Secure Booking',
  '💬 Private In-App Chat',
  '📍 Nearby Professionals',
];

export default function LandingPage() {
  return (
    <div>
      <div className="navbar">
        <Link to="/" className="navbar-brand">
          <span className="heart">💙</span> Carely
        </Link>
        <div className="navbar-links">
          <Link to="/login" className="btn-primary">Sign In</Link>
          <Link to="/register" className="btn-outline">Sign Up</Link>
        </div>
      </div>

      <div className="hero">
        <h1>Welcome to Carely</h1>
        <p>Your trusted platform to find verified care professionals across Bangladesh</p>
        <div className="hero-buttons">
          <Link to="/register" className="hero-btn-green">Get Started</Link>
          <Link to="/login" className="hero-btn-blue">Sign In</Link>
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {TRUST_PILLS.map((label) => (
            <span key={label} className="trust-pill">{label}</span>
          ))}
        </div>
      </div>

      <div className="section" style={{ background: '#fff', maxWidth: 'none', paddingTop: 56, paddingBottom: 56 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
          <h2 className="section-title" style={{ marginBottom: 8 }}>How It Works</h2>
          <div className="grid-3" style={{ marginTop: 32 }}>
            {STEPS.map((step) => (
              <div key={step.title} className="feature-card">
                <h3 style={{ marginBottom: 8 }}>{step.title}</h3>
                <p className="text-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section" style={{ background: '#F5F7FA', maxWidth: 'none', paddingTop: 56, paddingBottom: 56 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
          <h2 className="section-title">Our Services</h2>
          <p className="section-subtitle">Professionals across four essential care categories</p>
          <div className="grid-4">
            {SERVICES.map((s) => (
              <div key={s.title} className="feature-card">
                <div className="feature-icon"><s.icon size={26} /></div>
                <h3 style={{ marginBottom: 8 }}>{s.title}</h3>
                <p className="text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section" style={{ maxWidth: 720 }}>
        <SafetyDisclaimer />
      </div>

      <div className="site-footer">
        <div style={{ marginBottom: 12, fontWeight: 800, fontSize: 18, color: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Heart size={20} fill="#2B7FFF" color="#2B7FFF" /> Carely
        </div>
        <div>
          <Link to="/terms">Terms</Link> | <Link to="/privacy">Privacy</Link>
        </div>
        <p style={{ marginTop: 16, fontSize: 12 }}>
          &copy; 2025 Carely. All rights reserved.
        </p>
      </div>
    </div>
  );
}
