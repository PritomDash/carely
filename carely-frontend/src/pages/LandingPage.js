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

      <div style={{ background:'linear-gradient(135deg,#0F172A,#1E293B)', padding:'64px 28px' }}>
        <div style={{ maxWidth:900, margin:'0 auto', textAlign:'center' }}>

          <div style={{ fontSize:14, fontWeight:700, color:'#60A5FA', letterSpacing:2, textTransform:'uppercase', marginBottom:12 }}>
            GET THE APP
          </div>
          <h2 style={{ color:'white', fontSize:34, fontWeight:800, marginBottom:12, lineHeight:1.2 }}>
            Use Carely on Your Phone
          </h2>
          <p style={{ color:'#94A3B8', fontSize:16, marginBottom:48, maxWidth:500, margin:'0 auto 48px' }}>
            Download the Carely app for Android or install directly from your browser. Available free.
          </p>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, maxWidth:700, margin:'0 auto' }}>

            {/* APK Download Card */}
            <div style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:'32px 24px', textAlign:'center', backdropFilter:'blur(10px)' }}>
              <div style={{ fontSize:52, marginBottom:16 }}>🤖</div>
              <h3 style={{ color:'white', fontWeight:800, fontSize:20, marginBottom:8 }}>Android APK</h3>
              <p style={{ color:'#94A3B8', fontSize:14, marginBottom:24, lineHeight:1.6 }}>
                Download and install directly on your Android phone. No Play Store needed.
              </p>
              <a
                href="https://carely-tan.vercel.app"
                style={{ display:'block', padding:'14px 0', background:'linear-gradient(135deg,#2B7FFF,#60A5FA)', color:'white', borderRadius:12, fontWeight:700, fontSize:15, textDecoration:'none', boxShadow:'0 4px 20px rgba(43,127,255,0.4)' }}
              >
                🌐 Open Web App
              </a>
              <div style={{ marginTop:12, fontSize:12, color:'#64748B' }}>
                Android 7.0 and above
              </div>
            </div>

            {/* Install from Browser Card */}
            <div style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:'32px 24px', textAlign:'center', backdropFilter:'blur(10px)' }}>
              <div style={{ fontSize:52, marginBottom:16 }}>🌐</div>
              <h3 style={{ color:'white', fontWeight:800, fontSize:20, marginBottom:8 }}>Install from Browser</h3>
              <p style={{ color:'#94A3B8', fontSize:14, marginBottom:24, lineHeight:1.6 }}>
                Open in Chrome on Android and add to home screen. Works instantly, no download needed.
              </p>
              <div style={{ padding:'14px 0', background:'rgba(255,255,255,0.10)', color:'white', borderRadius:12, fontWeight:600, fontSize:14 }}>
                📲 How to install:
              </div>
              <div style={{ marginTop:12, textAlign:'left' }}>
                {[
                  'Open this site in Chrome',
                  'Tap menu (⋮) top right',
                  'Tap "Add to Home screen"',
                  'Tap Add to confirm',
                ].map((step, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, color:'#94A3B8', fontSize:13, marginBottom:6 }}>
                    <span style={{ color:'#60A5FA', fontWeight:700, flexShrink:0 }}>{i+1}.</span>
                    {step}
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div style={{ marginTop:32, padding:'16px 24px', background:'rgba(255,255,255,0.04)', borderRadius:12, display:'inline-block' }}>
            <p style={{ color:'#64748B', fontSize:13, margin:0 }}>
              🔜 Coming soon to Google Play Store
            </p>
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
