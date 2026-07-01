import React from 'react';
import { Link } from 'react-router-dom';
import SafetyDisclaimer from '../components/SafetyDisclaimer';
import { Heart, Baby, HeartHandshake, Stethoscope, Activity, Search, UserCheck, CheckCircle2, ShieldCheck } from 'lucide-react';

const SERVICES = [
  { icon: Baby, title: 'Child Care', desc: 'Trusted babysitters and nannies for your children, verified and background-checked.' },
  { icon: HeartHandshake, title: 'Aged Care', desc: 'Compassionate caregivers to support elderly family members at home.' },
  { icon: Stethoscope, title: 'Nurse', desc: 'Qualified nurses for home visits, post-surgery care, and ongoing treatment.' },
  { icon: Activity, title: 'Physiotherapist', desc: 'Licensed physiotherapists for rehabilitation and mobility support at home.' },
];

const STEPS = [
  { icon: Search, title: 'Search', desc: 'Search for a professional near you or post a job describing what you need.' },
  { icon: UserCheck, title: 'Choose', desc: 'Compare profiles, ratings, and rates, then pick the professional that fits.' },
  { icon: CheckCircle2, title: 'Confirm', desc: 'Confirm booking and pay professional directly' },
];

export default function LandingPage() {
  return (
    <div>
      <div className="nav">
        <div className="nav-inner">
          <Link to="/" className="nav-logo">
            <Heart size={22} color="#2563EB" fill="#2563EB" /> Carely
          </Link>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/login">Login</Link>
          </div>
        </div>
      </div>

      <div className="hero">
        <h1>Find Trusted Care Professionals in Bangladesh</h1>
        <p>
          Carely connects you with verified child care, aged care, nursing, and physiotherapy
          professionals across Bangladesh — book with confidence, pay in BDT.
        </p>
        <div className="hero-actions">
          <Link to="/register" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: 15 }}>Get Started</Link>
          <Link to="/login" className="btn btn-outline" style={{ padding: '12px 28px', fontSize: 15 }}>Login</Link>
        </div>
        <div style={{ marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 8, color: '#2563EB', fontWeight: 500, fontSize: 14 }}>
          <ShieldCheck size={18} /> Safe & Verified
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

      <div className="section" style={{ background: '#fff' }}>
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

      <div className="section" style={{ maxWidth: 720 }}>
        <SafetyDisclaimer />
      </div>

      <div className="site-footer">
        <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 16, color: '#fff' }}>Carely</div>
        <div>
          <Link to="/terms">Terms & Conditions</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
        <p style={{ marginTop: 16, fontSize: 12, color: '#9ca3af' }}>
          &copy; {new Date().getFullYear()} Carely. A care marketplace for Bangladesh.
        </p>
      </div>
    </div>
  );
}
