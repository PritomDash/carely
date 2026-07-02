import React from 'react';
import { Link } from 'react-router-dom';
import SafetyDisclaimer from '../components/SafetyDisclaimer';
import AppFooter from '../components/AppFooter';
import { Baby, HeartHandshake, Stethoscope, Activity } from 'lucide-react';

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

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>or</span>
          <a
            href="https://github.com/PritomDash/carely/releases/latest/download/Carely.apk"
            style={{
              fontSize: 14,
              color: '#2B7FFF',
              textDecoration: 'underline',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 500,
            }}
          >
            📱 Download Android App (APK)
          </a>
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

      <div className="section" style={{ background: '#fff', maxWidth: 'none', paddingTop: 0, paddingBottom: 56 }}>
        <div style={{ background: '#F0F7FF', borderRadius: 14, padding: '20px 24px', maxWidth: 600, margin: '0 auto 40px', border: '1px solid #BFDBFE' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>📱</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#1E40AF' }}>Use Carely on Your Android Phone</span>
          </div>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: '0 0 12px' }}>
            Carely works as an app on your Android phone. Two easy ways to get it:
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1E40AF', marginBottom: 4 }}>Option 1 — Download APK</div>
              <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
                Download directly without Play Store.
                After downloading tap the file — if blocked go to{' '}
                <strong>Settings → Security → Enable Unknown Sources</strong>
                {' '}then tap Install.{' '}
                <a
                  href="https://github.com/PritomDash/carely/releases/latest/download/Carely.apk"
                  style={{ color: '#2B7FFF', fontWeight: 600, textDecoration: 'none' }}
                >
                  Download Carely.apk
                </a>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1E40AF', marginBottom: 4 }}>Option 2 — Install from Chrome</div>
              <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
                Open in Chrome → tap menu ⋮ → Add to Home screen → tap Add
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section" style={{ maxWidth: 720 }}>
        <SafetyDisclaimer />
      </div>

      <AppFooter />
    </div>
  );
}
