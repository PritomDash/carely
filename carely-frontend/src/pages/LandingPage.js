import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppFooter from '../components/AppFooter';
import CarelyLogo from '../components/CarelyLogo';
import Reveal from '../components/Reveal';
import CountUpStat from '../components/CountUpStat';
import useReveal from '../hooks/useReveal';
import { isStandalone, requestInstall } from '../utils/pwaInstall';

const PHOTOS = {
  hero: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=1200&q=80',
  childCare: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&q=80',
  agedCare: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&q=80',
  nurse: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&q=80',
  physio: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
  laptop: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80',
  family: 'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=600&q=80',
};

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [showInstall] = useState(() => !isStandalone());

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [childCareRef, childCareVisible] = useReveal();
  const [agedCareRef, agedCareVisible] = useReveal();
  const [nurseRef, nurseVisible] = useReveal();
  const [physioRef, physioVisible] = useReveal();

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>

      {/* STICKY NAVBAR */}
      <nav className="landing-nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: scrolled ? 'rgba(255,255,255,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.08)' : 'none',
        padding: '0 40px', height: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CarelyLogo size={30} white={!scrolled} />
          <span style={{ fontSize: 24, fontWeight: 900, color: scrolled ? '#1A1A2E' : '#FFFFFF', letterSpacing: '-0.5px' }}>Carely</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link to="/login" className="landing-nav-btn" style={{ padding: '10px 22px', border: '1.5px solid', borderColor: scrolled ? '#2563EB' : 'rgba(255,255,255,0.6)', borderRadius: 10, color: scrolled ? '#2563EB' : '#FFFFFF', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Sign In</Link>
          <Link to="/register" className="landing-nav-btn" style={{ padding: '10px 22px', background: scrolled ? '#2563EB' : '#FFFFFF', borderRadius: 10, color: scrolled ? '#FFFFFF' : '#1E3A8A', fontWeight: 800, fontSize: 14, textDecoration: 'none', boxShadow: '0 2px 12px rgba(37,99,235,0.25)' }}>
            <span className="landing-btn-text-full">Get Started Free</span>
            <span className="landing-btn-text-short">Get Started</span>
          </Link>
        </div>
      </nav>

      {/* HERO - FULL SCREEN WITH PHOTO */}
      <div className="landing-hero" style={{ position: 'relative', height: '100vh', minHeight: 600, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>

        {/* Background photo */}
        <img
          src={PHOTOS.hero}
          alt="Care professional with elderly"
          className="landing-hero-bg-img"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />

        {/* Dark overlay with blue tint */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,78,0.88) 0%, rgba(29,78,216,0.80) 50%, rgba(37,99,235,0.70) 100%)' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 780, padding: '0 40px', margin: '0 auto', textAlign: 'center', width: '100%' }}>

          <div className="landing-hero-badge-wrap" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 24, padding: '8px 20px', marginBottom: 28 }}>
            <span>🇧🇩</span>
            <span style={{ color: 'rgba(255,255,255,0.95)', fontSize: 14, fontWeight: 600 }}>Bangladesh's #1 Care Marketplace</span>
          </div>

          <h1 className="landing-hero-title" style={{ fontSize: 58, fontWeight: 900, color: '#FFFFFF', marginBottom: 20, lineHeight: 1.1, letterSpacing: '-2px' }}>
            Find Trusted Care<br />
            <span style={{ color: '#93C5FD' }}>Professionals</span> Near You
          </h1>

          <p className="landing-hero-subtitle" style={{ fontSize: 19, color: 'rgba(255,255,255,0.88)', marginBottom: 40, lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px' }}>
            Connect with child care, aged care, nursing, and physiotherapy professionals across all 64 districts of Bangladesh.
          </p>

          <div className="landing-hero-buttons" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
            <Link to="/register" className="landing-hero-btn" style={{
              padding: '18px 40px', background: '#FFFFFF', color: '#1E3A8A',
              borderRadius: 14, fontWeight: 900, fontSize: 18, textDecoration: 'none',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              Get Started Free →
            </Link>
            <Link to="/login" className="landing-hero-btn" style={{
              padding: '18px 40px', background: 'rgba(255,255,255,0.12)',
              color: '#FFFFFF', borderRadius: 14, fontWeight: 700, fontSize: 18,
              textDecoration: 'none', border: '2px solid rgba(255,255,255,0.35)',
              backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              Sign In
            </Link>
          </div>

          <div className="landing-hero-badges" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['✓ Trusted Marketplace', '🔒 Secure Booking', '💬 In-App Chat', '📍 All 64 Districts'].map(b => (
              <div key={b} className="landing-hero-badge" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '7px 16px', color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 500 }}>
                {b}
              </div>
            ))}
          </div>

          {showInstall && (
            <button
              onClick={requestInstall}
              style={{
                marginTop: 20, background: 'none', border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 20, padding: '7px 18px', color: 'rgba(255,255,255,0.9)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              📱 Install App
            </button>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="landing-scroll-indicator" style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center' }}>
          <div>↓</div>
          <div>Scroll</div>
        </div>
      </div>

      {/* STATS STRIP */}
      <div style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)', padding: '28px 40px' }}>
        <div className="landing-stats-row" style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 20 }}>
          {[
            { n: '500+', l: 'Care Professionals' },
            { n: '64', l: 'Districts Covered' },
            { n: '4', l: 'Service Types' },
            { n: '100%', l: 'Free to Join' },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center' }}>
              <CountUpStat value={s.n} className="landing-stat-number" style={{ fontSize: 32, fontWeight: 900, color: '#93C5FD' }} />
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SERVICES WITH REAL PHOTOS */}
      <div className="landing-section" style={{ padding: '80px 40px', background: '#FFFFFF' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2563EB', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>OUR SERVICES</div>
            <h2 style={{ fontSize: 42, fontWeight: 900, color: '#1A1A2E', marginBottom: 14, letterSpacing: '-1px' }}>Professional Care at Your Door</h2>
            <p style={{ fontSize: 17, color: '#64748B', maxWidth: 500, margin: '0 auto' }}>Expert care professionals available across Bangladesh</p>
          </div>

          <div className="landing-services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>

            {/* Child Care - Large card */}
            <div
              ref={childCareRef}
              className={`landing-service-card-large reveal-up ${childCareVisible ? 'reveal-visible' : ''}`}
              style={{ borderRadius: 24, overflow: 'hidden', position: 'relative', height: 380, cursor: 'pointer', gridRow: 'span 1' }}
            >
              <img src={PHOTOS.childCare} alt="Child Care" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 60%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '28px 28px 28px' }}>
                <div style={{ background: '#3B82F6', color: 'white', display: 'inline-block', padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>CHILD CARE</div>
                <h3 style={{ color: 'white', fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Trusted Baby & Child Care</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>Professional nannies and babysitters, experienced with children of all ages.</p>
                <Link to="/register" style={{ display: 'inline-block', marginTop: 16, padding: '10px 22px', background: 'white', color: '#1E3A8A', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Find Child Care →</Link>
              </div>
            </div>

            {/* Right column - two cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Aged Care */}
              <div
                ref={agedCareRef}
                className={`landing-service-card-medium reveal-up ${agedCareVisible ? 'reveal-visible' : ''}`}
                style={{ borderRadius: 24, overflow: 'hidden', position: 'relative', height: 175, transitionDelay: agedCareVisible ? '100ms' : '0ms' }}
              >
                <img src={PHOTOS.agedCare} alt="Aged Care" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.2) 100%)' }} />
                <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 24, right: 24 }}>
                  <div style={{ background: '#7C3AED', color: 'white', display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>AGED CARE</div>
                  <h3 style={{ color: 'white', fontSize: 19, fontWeight: 800, marginBottom: 6 }}>Compassionate Elderly Care</h3>
                  <Link to="/register" style={{ color: '#C4B5FD', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Find Aged Care →</Link>
                </div>
              </div>

              {/* Bottom row - Nurse and Physio */}
              <div className="landing-services-subgrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, flex: 1 }}>

                {/* Nurse */}
                <div
                  ref={nurseRef}
                  className={`landing-service-card-small reveal-up ${nurseVisible ? 'reveal-visible' : ''}`}
                  style={{ borderRadius: 24, overflow: 'hidden', position: 'relative', transitionDelay: nurseVisible ? '180ms' : '0ms' }}
                >
                  <img src={PHOTOS.nurse} alt="Nurse" style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: 155 }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 50%)' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px' }}>
                    <div style={{ background: '#059669', color: 'white', display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>NURSE</div>
                    <h3 style={{ color: 'white', fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Home Nursing Care</h3>
                    <Link to="/register" style={{ color: '#6EE7B7', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Find Nurse →</Link>
                  </div>
                </div>

                {/* Physio */}
                <div
                  ref={physioRef}
                  className={`landing-service-card-small reveal-up ${physioVisible ? 'reveal-visible' : ''}`}
                  style={{ borderRadius: 24, overflow: 'hidden', position: 'relative', transitionDelay: physioVisible ? '260ms' : '0ms' }}
                >
                  <img src={PHOTOS.physio} alt="Physiotherapy" style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: 155 }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 50%)' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px' }}>
                    <div style={{ background: '#EA580C', color: 'white', display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>PHYSIO</div>
                    <h3 style={{ color: 'white', fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Physiotherapy</h3>
                    <Link to="/register" style={{ color: '#FED7AA', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Find Physio →</Link>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="landing-section" style={{ padding: '80px 40px', background: '#F8FAFF' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2563EB', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>SIMPLE PROCESS</div>
            <h2 style={{ fontSize: 42, fontWeight: 900, color: '#1A1A2E', letterSpacing: '-1px' }}>Book in 3 Easy Steps</h2>
          </div>
          <div className="landing-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { num: '01', icon: '🔍', title: 'Search', desc: 'Find care professionals near your location by service type and availability.', color: '#EBF3FF', accent: '#2563EB' },
              { num: '02', icon: '📅', title: 'Book', desc: 'Send a booking request with your preferred date, time, and requirements.', color: '#F3E8FF', accent: '#7C3AED' },
              { num: '03', icon: '✅', title: 'Confirm', desc: 'Professional accepts and you both get each others contact details to coordinate.', color: '#DCFCE7', accent: '#16A34A' },
            ].map((s, i) => (
              <Reveal key={s.num} direction="left" delay={i * 120} style={{ background: 'white', border: '1.5px solid #E8EDF3', borderRadius: 20, padding: '32px 28px', position: 'relative', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: '#F1F5F9', position: 'absolute', top: 16, right: 20, lineHeight: 1 }}>{s.num}</div>
                <div style={{ width: 60, height: 60, background: s.color, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 20 }}>{s.icon}</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A2E', marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* APP SHOWCASE - Laptop mockup section */}
      <div className="landing-section" style={{ padding: '80px 40px', background: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)', overflow: 'hidden' }}>
        <div className="landing-showcase-grid" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#93C5FD', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>AVAILABLE EVERYWHERE</div>
            <h2 style={{ fontSize: 42, fontWeight: 900, color: '#FFFFFF', marginBottom: 20, lineHeight: 1.2, letterSpacing: '-1px' }}>Use Carely on Any Device</h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.8)', lineHeight: 1.8, marginBottom: 32 }}>
              Access Carely from any browser on your phone, tablet, or computer. Install as an app on Android for the best experience.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {[
                'Works on all Android phones',
                'Instant install from Chrome browser',
                'No app store download needed',
                'Always up to date automatically',
              ].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>
                  <div style={{ width: 24, height: 24, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</div>
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            {/* Laptop mockup */}
            <div style={{ background: '#1A1A2E', borderRadius: 16, padding: '12px 12px 0', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
              <div style={{ background: '#2D3748', borderRadius: '8px 8px 0 0', padding: '8px 12px', display: 'flex', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
              </div>
              <img src={PHOTOS.laptop} alt="Carely App" style={{ width: '100%', borderRadius: '4px 4px 0 0', display: 'block', maxHeight: 280, objectFit: 'cover' }} />
            </div>
            <div style={{ background: '#0F172A', height: 16, borderRadius: '0 0 8px 8px', marginTop: 0 }} />
            <div style={{ background: '#1E293B', height: 8, borderRadius: 4, margin: '0 20px' }} />
          </div>
        </div>
      </div>

      {/* TESTIMONIAL / TRUST SECTION */}
      <div className="landing-section" style={{ padding: '80px 40px', background: '#FFFFFF' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#2563EB', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>WHY CARELY</div>
          <h2 style={{ fontSize: 42, fontWeight: 900, color: '#1A1A2E', marginBottom: 48, letterSpacing: '-1px' }}>Built for Bangladesh Families</h2>
          <div className="landing-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { icon: '🔍', title: 'Easy to Find', desc: 'Search by your division, district, and thana. Find professionals right in your neighborhood.' },
              { icon: '✅', title: 'Detailed Profiles', desc: 'Professionals upload their identity documents to their profile. You can review before hiring anyone.' },
              { icon: '💬', title: 'Chat in App', desc: 'Once booking is confirmed chat directly through the app. Safe and private.' },
              { icon: '📅', title: 'Smart Booking', desc: 'See real-time availability. No double bookings. Book your exact time slot.' },
              { icon: '⭐', title: 'Rated by Users', desc: 'Read honest reviews from other customers before making your choice.' },
              { icon: '🆓', title: 'Free for Customers', desc: 'Finding and booking care professionals is completely free for customers.' },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 90} style={{ padding: '28px 24px', border: '1.5px solid #E8EDF3', borderRadius: 16, textAlign: 'left', transition: 'box-shadow 0.2s, opacity 0.6s ease-out, transform 0.6s ease-out', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1A1A2E', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* CTA SECTION */}
      <div className="landing-section" style={{ padding: '80px 40px', background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #2563EB 100%)', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 46, fontWeight: 900, color: '#FFFFFF', marginBottom: 16, lineHeight: 1.1, letterSpacing: '-1.5px' }}>
            Ready to Find Your<br />Care Professional?
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', marginBottom: 40, lineHeight: 1.7 }}>
            Join thousands of families across Bangladesh finding trusted care through Carely.
          </p>
          <div className="landing-cta-buttons" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="landing-cta-pulse" style={{ padding: '18px 44px', background: '#FFFFFF', color: '#1E3A8A', borderRadius: 14, fontWeight: 900, fontSize: 18, textDecoration: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              Get Started Free
            </Link>
            <Link to="/register?type=professional" style={{ padding: '18px 44px', background: 'rgba(255,255,255,0.12)', color: '#FFFFFF', borderRadius: 14, fontWeight: 700, fontSize: 18, textDecoration: 'none', border: '2px solid rgba(255,255,255,0.3)' }}>
              Join as Professional
            </Link>
          </div>
        </div>
      </div>

      {/* INSTALL AS APP TIP */}
      <div className="landing-section" style={{ background: '#F0F7FF', padding: '40px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', background: 'white', borderRadius: 16, padding: '24px 28px', border: '1.5px solid #BFDBFE', boxShadow: '0 2px 12px rgba(37,99,235,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>📱</span>
            <span style={{ fontWeight: 800, fontSize: 17, color: '#1E40AF' }}>Install Carely as an App</span>
          </div>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: '0 0 12px' }}>
            Carely works as an app on your phone. Just open the website in Chrome browser and add to home screen — done in 10 seconds.
          </p>
          <div style={{ background: '#F7FAFF', borderRadius: 10, padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { n: '1', text: 'Open in Chrome' },
              { n: '2', text: 'Tap menu ⋮' },
              { n: '3', text: 'Add to Home screen' },
              { n: '4', text: 'Tap Add' },
            ].map(s => (
              <div key={s.n} style={{ textAlign: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563EB', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, margin: '0 auto 6px', fontSize: 14 }}>{s.n}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
