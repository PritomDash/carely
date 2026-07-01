import React from 'react';
import { Link } from 'react-router-dom';
import SafetyDisclaimer from '../components/SafetyDisclaimer';
import {
  Heart, Baby, HeartHandshake, Stethoscope, Activity,
  Search, UserCheck, CheckCircle2, ShieldCheck, Lock, Clock,
} from 'lucide-react';

const SERVICES = [
  { icon: Baby, title: 'Child Care', desc: 'Trusted babysitters and nannies for your children, verified and background-checked.' },
  { icon: HeartHandshake, title: 'Aged Care', desc: 'Compassionate caregivers to support elderly family members at home.' },
  { icon: Stethoscope, title: 'Nurse', desc: 'Qualified nurses for home visits, post-surgery care, and ongoing treatment.' },
  { icon: Activity, title: 'Physiotherapist', desc: 'Licensed physiotherapists for rehabilitation and mobility support at home.' },
];

const STEPS = [
  { icon: Search, title: 'Search', desc: 'Find professionals near you by location and service type.' },
  { icon: UserCheck, title: 'Book', desc: 'Choose your date and time, submit booking request.' },
  { icon: CheckCircle2, title: 'Confirm', desc: 'Professional accepts, meet and pay directly.' },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'Verified Professionals' },
  { icon: Lock, label: 'Secure Booking' },
  { icon: Clock, label: '24/7 Support' },
];

export default function LandingPage() {
  return (
    <div>
      <div className="navbar">
        <Link to="/" className="navbar-brand">
          <span className="heart">💙</span> Carely
        </Link>
        <div className="navbar-links">
          <Link to="/login">Sign In</Link>
          <Link to="/register">Get Started</Link>
        </div>
      </div>

      <div className="hero">
        <h1>Find Trusted Care Professionals in Bangladesh</h1>
        <p>
          Connect with verified child care, aged care, nursing, and physiotherapy professionals.
          Book with confidence.
        </p>
        <div className="hero-buttons">
          <Link to="/register" className="hero-btn-white">Get Started</Link>
          <Link to="/login" className="hero-btn-outline">Sign In</Link>
        </div>

        <div style={{ marginTop: 40, display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
          {TRUST_BADGES.map((b) => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, fontSize: 14 }}>
              <b.icon size={18} /> {b.label}
            </div>
          ))}
        </div>
      </div>

      <div className="section">
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

      <div className="section" style={{ background: 'var(--primary-light)', maxWidth: 'none', paddingLeft: 0, paddingRight: 0 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Getting the right care takes three simple steps</p>
          <div className="grid-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="step-card">
                <div className="step-number">{i + 1}</div>
                <div className="feature-icon" style={{ marginBottom: 12 }}><step.icon size={22} /></div>
                <h3 style={{ marginBottom: 8 }}>{step.title}</h3>
                <p className="text-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section" style={{ maxWidth: 720 }}>
        <SafetyDisclaimer />
      </div>

      <div className="site-footer">
        <div style={{ marginBottom: 12, fontWeight: 800, fontSize: 18, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Heart size={20} fill="#fff" /> Carely
        </div>
        <p style={{ marginBottom: 16, fontSize: 13 }}>Bangladesh's trusted care marketplace</p>
        <div>
          <Link to="/terms">Terms & Conditions</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
        <p style={{ marginTop: 16, fontSize: 12, color: '#bfdbfe' }}>
          &copy; {new Date().getFullYear()} Carely. A care marketplace for Bangladesh.
        </p>
      </div>
    </div>
  );
}
