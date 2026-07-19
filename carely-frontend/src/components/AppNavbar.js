import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socket from '../socket';
import { setupPushNotifications } from '../utils/pushManager';
import { isStandalone, requestInstall } from '../utils/pwaInstall';
import CarelyLogo from './CarelyLogo';
import NotificationBell from './NotificationBell';

// Module-scope, not state - AppNavbar remounts on every page (each page
// imports its own copy), but this flag survives those remounts for the
// life of the tab, so the heartbeat still only fires once per session load.
let heartbeatSent = false;
let founderWelcomeTimerArmed = false;

export default function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [credits, setCredits] = useState(null);
  const [boostStatus, setBoostStatus] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Credits are a customer-only mechanic (paid emergency posts) - professionals
  // never spend them, so the navbar shows Boost status for them instead.
  useEffect(() => {
    if (!user || user.role === 'professional') return;
    const fetchBalance = () => {
      api.get('/api/credits/my-balance')
        .then(r => setCredits(r.data.credits ?? 0))
        .catch(() => {});
    };
    fetchBalance();
    // Emergency posts, top-ups etc. happen on other pages/components - they
    // broadcast this event so the navbar balance (which would otherwise
    // only refetch on next full mount) stays correct instead of showing a
    // stale pre-deduction number.
    window.addEventListener('carely-credits-changed', fetchBalance);
    return () => window.removeEventListener('carely-credits-changed', fetchBalance);
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'professional') return;
    api.get('/api/featured/my-status')
      .then(r => setBoostStatus(r.data))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    socket.emit('joinRoom', user._id);
  }, [user]);

  useEffect(() => {
    if (!user || heartbeatSent) return;
    heartbeatSent = true;
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    api.post('/api/users/heartbeat', { standalone }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('carelyToken');
    if (token) {
      setTimeout(() => {
        setupPushNotifications(token).catch(() => {});
      }, 3000);
    }
  }, [user?._id]);

  // Founder welcome push+in-app notification for professionals, timed to
  // land ~20-30s after registration (falling back to ~25s after this first
  // load for anyone who registered before push was subscribed, or before
  // this feature existed). Guarded module-wide so navigating between pages
  // never arms a second timer; the backend call is itself idempotent via
  // founderWelcomeNotifiedAt, so even a rare double-arm is harmless. Not
  // cleared on unmount on purpose - it's a background browser timer that
  // should keep counting down across in-app navigation, same as heartbeat.
  useEffect(() => {
    if (!user || user.role !== 'professional' || user.founderWelcomeNotifiedAt) return;
    if (founderWelcomeTimerArmed) return;
    founderWelcomeTimerArmed = true;
    const registeredAt = Number(localStorage.getItem('carelyFounderWelcomeRegisteredAt')) || Date.now();
    const delay = Math.max(0, registeredAt + 25000 - Date.now());
    setTimeout(() => {
      api.post('/api/users/founder-welcome-notify').catch(() => {});
    }, delay);
  }, [user?._id, user?.role, user?.founderWelcomeNotifiedAt]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const initials = (name) => name ? name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) : '?';
  const active = (p) => location.pathname === p;

  const customerTabs = [
    { icon:'🏠', label:'Home', shortLabel:'Home', path:'/home' },
    { icon:'📋', label:'My Bookings', shortLabel:'Bookings', path:'/my-bookings' },
    { icon:'📝', label:'Post a Job', shortLabel:'Post', path:'/create-job-post' },
    { icon:'📌', label:'My Posts', shortLabel:'Posts', path:'/my-posts' },
    { icon:'💬', label:'Chat', shortLabel:'Chat', path:'/chat-inbox' },
    { icon:'👤', label:'My Profile', shortLabel:'Profile', path:'/edit-profile' },
    { icon:'💳', label:'My Credits', shortLabel:'Credits', path:'/my-credits' },
  ];

  const proTabs = [
    { icon:'🏠', label:'Home', shortLabel:'Home', path:'/home' },
    { icon:'📋', label:'My Bookings', shortLabel:'Bookings', path:'/my-bookings' },
    { icon:'📢', label:'Job Feed', shortLabel:'Jobs', path:'/job-posts' },
    { icon:'💬', label:'Chat', shortLabel:'Chat', path:'/chat-inbox' },
    { icon:'👤', label:'My Profile', shortLabel:'Profile', path:'/edit-profile' },
    { icon:'⭐', label:'Boost Profile', shortLabel:'Boost', path:'/boost' },
    { icon:'📄', label:'Documents', shortLabel:'Docs', path:'/upload-documents' },
  ];

  const adminTabs = [
    { icon:'🏠', label:'Home', shortLabel:'Home', path:'/home' },
    { icon:'🛡️', label:'Dashboard', shortLabel:'Dashboard', path:'/admin' },
  ];

  const tabs = !user ? [] : user.role==='professional' ? proTabs : user.role==='admin' ? adminTabs : customerTabs;
  const isSmallMobile = window.innerWidth < 480;
  const isMobile = window.innerWidth < 768;

  const tabStyle = (p) => ({
    display:'flex', alignItems:'center', gap:6,
    padding:'0 16px', height:46, fontSize:13, fontWeight:600,
    color: active(p) ? '#2B7FFF' : '#64748B',
    borderBottom: active(p) ? '2px solid #2B7FFF' : '2px solid transparent',
    textDecoration:'none', whiteSpace:'nowrap',
    transition:'color 0.15s', flexShrink:0,
  });

  return (
    <nav style={{ position:'sticky', top:0, zIndex:200, background:'#FFFFFF', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' }}>

      <div className="navbar-row1" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', height:64, borderBottom:'1px solid #F1F5F9' }}>

        <Link to={user ? '/home' : '/'} style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <CarelyLogo size={30} />
          <span style={{ fontSize:22, fontWeight:800, color:'#1A1A2E', letterSpacing:'-0.5px' }}>Carely</span>
        </Link>

        {user ? (
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <NotificationBell userId={user._id} />
            <span className="hide-mobile" style={{ fontSize:14, fontWeight:600, color:'#374151' }}>{user.name}</span>
            <div ref={ref} style={{ position:'relative' }}>
              <div onClick={() => setOpen(!open)} style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#2B7FFF,#60A5FA)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:15, cursor:'pointer', boxShadow:'0 2px 8px rgba(43,127,255,0.35)', userSelect:'none' }}>
                {initials(user.name)}
              </div>
              {open && (
                <div style={{ position:'absolute', right:0, top:'115%', background:'#fff', border:'1px solid #E2E8F0', borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,0.14)', width:230, padding:12, zIndex:300 }}>
                  <div style={{ textAlign:'center', padding:'10px 0 14px' }}>
                    <div style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,#2B7FFF,#60A5FA)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:20, margin:'0 auto 10px' }}>
                      {initials(user.name)}
                    </div>
                    <div style={{ fontWeight:700, fontSize:15, color:'#1A1A2E' }}>{user.name}</div>
                    <div style={{ fontSize:12, color:'#64748B', marginTop:3 }}>{user.email}</div>
                    <div style={{ marginTop:8, display:'inline-block', padding:'3px 14px', background:'#EBF3FF', color:'#1D4ED8', borderRadius:20, fontSize:12, fontWeight:700, textTransform:'capitalize' }}>{user.role}</div>
                    {user.role !== 'professional' && credits != null && (
                      <div
                        onClick={() => { navigate('/my-credits'); setOpen(false); }}
                        style={{
                          marginTop:10, display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer',
                          padding:'4px 14px', borderRadius:20, fontSize:12, fontWeight:700,
                          background: credits < 5 ? '#FEE2E2' : '#EBF3FF',
                          color: credits < 5 ? '#DC2626' : '#1D4ED8',
                        }}
                      >
                        💳 {credits} credits{credits < 5 ? ' — Buy more' : ''}
                      </div>
                    )}
                    {user.role === 'professional' && (
                      <div
                        onClick={() => { navigate('/boost'); setOpen(false); }}
                        style={{
                          marginTop:10, display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer',
                          padding:'4px 14px', borderRadius:20, fontSize:12, fontWeight:700,
                          background: boostStatus?.isFeatured ? '#FEF3C7' : '#EBF3FF',
                          color: boostStatus?.isFeatured ? '#92400E' : '#1D4ED8',
                        }}
                      >
                        {boostStatus?.isFeatured
                          ? `⭐ Boosted - ${Math.max(0, Math.ceil((new Date(boostStatus.featuredUntil) - new Date()) / (1000 * 60 * 60 * 24)))} days left`
                          : '⭐ Boost Profile'}
                      </div>
                    )}
                  </div>
                  <div style={{ borderTop:'1px solid #F1F5F9', paddingTop:8 }}>
                    <button onClick={() => { logout(); navigate('/'); setOpen(false); }} style={{ width:'100%', padding:'11px 14px', background:'none', border:'1px solid #FEE2E2', borderRadius:8, color:'#EF4444', fontWeight:700, fontSize:14, cursor:'pointer', textAlign:'center' }}>
                      🚪 Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <Link to="/blog" style={{ color:'#64748B', fontSize:14, fontWeight:500, textDecoration:'none' }}>Blog</Link>
            <div style={{ display:'flex', gap:10 }}>
              <Link to="/login" style={{ padding:'9px 22px', border:'1.5px solid #2B7FFF', borderRadius:8, color:'#2B7FFF', fontWeight:700, fontSize:14, textDecoration:'none', transition:'all 0.15s' }}>Sign In</Link>
              <Link to="/register" style={{ padding:'9px 22px', background:'linear-gradient(135deg,#2B7FFF,#60A5FA)', borderRadius:8, color:'#fff', fontWeight:700, fontSize:14, textDecoration:'none', boxShadow:'0 2px 8px rgba(43,127,255,0.3)' }}>Get Started</Link>
            </div>
          </div>
        )}
      </div>

      {!isMobile && user && tabs.length > 0 && (
        <div
          className="navbar-tabs"
          style={{
            display:'flex', alignItems:'center', padding:'0 28px', height:46,
            overflowX:'auto', scrollbarWidth:'none', msOverflowStyle:'none',
            WebkitOverflowScrolling:'touch', background:'#FAFBFF',
          }}
        >
          {tabs.map(tab => {
            const label = isSmallMobile ? tab.shortLabel : tab.label;
            return (
              <Link key={tab.path} to={tab.path} style={tabStyle(tab.path)}>
                <span>{tab.icon}</span>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {isMobile && user && <BottomNav />}

    </nav>
  );
}

const BottomNav = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSheet, setShowSheet] = useState(false);
  const [credits, setCredits] = useState(null);
  const [boostStatus, setBoostStatus] = useState(null);

  useEffect(() => {
    if (!user || user.role === 'professional') return;
    const fetchBalance = () => {
      api.get('/api/credits/my-balance')
        .then(r => setCredits(r.data.credits))
        .catch(() => {});
    };
    fetchBalance();
    window.addEventListener('carely-credits-changed', fetchBalance);
    return () => window.removeEventListener('carely-credits-changed', fetchBalance);
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'professional') return;
    api.get('/api/featured/my-status')
      .then(r => setBoostStatus(r.data))
      .catch(() => {});
  }, [user]);

  const isActive = (path) => location.pathname === path;

  const customerMenu = [
    { icon: '📋', label: 'My Bookings', path: '/my-bookings' },
    { icon: '📝', label: 'Post a Job', path: '/create-job-post' },
    { icon: '📌', label: 'My Posts', path: '/my-posts' },
    { icon: '💳', label: 'My Credits & Top Up', path: '/my-credits' },
    { icon: '👤', label: 'Edit Profile', path: '/edit-profile' },
  ];

  const proMenu = [
    { icon: '📋', label: 'My Bookings', path: '/my-bookings' },
    { icon: '📢', label: 'Job Feed', path: '/job-posts' },
    { icon: '⭐', label: 'Boost Profile', path: '/boost' },
    { icon: '📄', label: 'Documents', path: '/upload-documents' },
    { icon: '👤', label: 'Edit Profile', path: '/edit-profile' },
  ];

  const menuItems = [
    ...(user?.role === 'professional' ? proMenu : customerMenu),
    ...(!isStandalone() ? [{ icon: '📱', label: 'Install App', action: requestInstall }] : []),
  ];

  const navItems = [
    { icon: '🏠', label: 'Home', path: '/home' },
    { icon: '💬', label: 'Chat', path: '/chat-inbox' },
    { icon: '🔔', label: 'Alerts', path: '/notifications' },
    { icon: '👤', label: 'Account', path: null },
  ];

  return (
    <>
      {/* Bottom nav bar */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: 64,
        background: '#FFFFFF',
        borderTop: '1px solid #E8EDF3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 200,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {navItems.map(item => (
          <button
            key={item.label}
            onClick={() => {
              if (item.label === 'Alerts') {
                window.dispatchEvent(new Event('carely-open-notifications'));
                setShowSheet(false);
              } else if (item.path) {
                navigate(item.path);
                setShowSheet(false);
              } else {
                setShowSheet(!showSheet);
              }
            }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0',
              color: item.path && isActive(item.path) ? '#2563EB' : '#64748B',
            }}
          >
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <span style={{
              fontSize: 11,
              fontWeight: item.path && isActive(item.path) ? 700 : 500,
              color: item.path && isActive(item.path) ? '#2563EB' : '#64748B',
            }}>
              {item.label}
            </span>
            {item.path && isActive(item.path) && (
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#2563EB', marginTop: 1 }} />
            )}
          </button>
        ))}
      </div>

      {/* Account bottom sheet overlay */}
      {showSheet && (
        <div
          onClick={() => setShowSheet(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 300,
          }}
        />
      )}

      {/* Account bottom sheet */}
      <div style={{
        position: 'fixed',
        bottom: showSheet ? 64 : '-100%',
        left: 0, right: 0,
        background: '#FFFFFF',
        borderRadius: '20px 20px 0 0',
        zIndex: 400,
        transition: 'bottom 0.3s ease',
        maxHeight: '75vh',
        overflowY: 'auto',
        paddingBottom: 20,
      }}>
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, background: '#E2E8F0', borderRadius: 2 }} />
        </div>

        {/* User info */}
        <div style={{ padding: '12px 20px 16px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563EB, #60A5FA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: 18,
            }}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>{user?.name}</div>
              <div style={{ fontSize: 12, color: '#64748B', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
            {user?.role !== 'professional' && (
              <div style={{ marginLeft: 'auto', background: '#EBF3FF', borderRadius: 8, padding: '4px 12px' }}>
                <div style={{ fontSize: 11, color: '#64748B' }}>Credits</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#2563EB' }}>{credits ?? '...'}</div>
              </div>
            )}
            {user?.role === 'professional' && (
              <div
                onClick={() => navigate('/boost')}
                style={{ marginLeft: 'auto', background: boostStatus?.isFeatured ? '#FEF3C7' : '#EBF3FF', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}
              >
                {boostStatus?.isFeatured ? (
                  <>
                    <div style={{ fontSize: 11, color: '#92400E' }}>⭐ Boosted</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#92400E' }}>
                      {Math.max(0, Math.ceil((new Date(boostStatus.featuredUntil) - new Date()) / (1000 * 60 * 60 * 24)))}d left
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#2563EB' }}>⭐ Boost</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Menu items */}
        <div style={{ padding: '8px 0' }}>
          {menuItems.map(item => (
            <button
              key={item.path || item.label}
              onClick={() => {
                if (item.action) item.action();
                else navigate(item.path);
                setShowSheet(false);
              }}
              style={{
                width: '100%', padding: '14px 20px',
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left',
                borderBottom: '1px solid #F8FAFF',
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 500, color: '#1A1A2E' }}>{item.label}</span>
              <span style={{ marginLeft: 'auto', color: '#CBD5E1', fontSize: 18 }}>›</span>
            </button>
          ))}
        </div>

        {/* Logout */}
        <div style={{ padding: '8px 20px 0' }}>
          <button
            onClick={() => { logout(); navigate('/'); setShowSheet(false); }}
            style={{
              width: '100%', padding: '14px 0',
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 12, color: '#EF4444', fontWeight: 700,
              fontSize: 15, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </>
  );
};
