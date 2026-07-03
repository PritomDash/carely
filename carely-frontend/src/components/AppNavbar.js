import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socket from '../socket';
import { setupPushNotifications } from '../utils/pushManager';

export default function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [credits, setCredits] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!user) return;
    api.get('/api/notifications/count-unread')
      .then(r => setUnread(r.data.unreadCount || 0))
      .catch(() => {});
  }, [user, location.pathname]);

  useEffect(() => {
    if (!user) return;
    api.get('/api/credits/my-balance')
      .then(r => setCredits(r.data.credits ?? 0))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    socket.emit('joinRoom', user._id);

    const handleNewNotification = () => {
      setUnread(prev => prev + 1);
    };

    socket.on('newNotification', handleNewNotification);
    return () => socket.off('newNotification', handleNewNotification);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('carelyToken');
    if (token) {
      setTimeout(() => {
        setupPushNotifications(token).catch(() => {});
      }, 2000);
    }
  }, [user?._id]);

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
  ];

  const proTabs = [
    { icon:'🏠', label:'Home', shortLabel:'Home', path:'/home' },
    { icon:'📋', label:'My Bookings', shortLabel:'Bookings', path:'/my-bookings' },
    { icon:'📢', label:'Job Feed', shortLabel:'Jobs', path:'/job-posts' },
    { icon:'💬', label:'Chat', shortLabel:'Chat', path:'/chat-inbox' },
    { icon:'👤', label:'My Profile', shortLabel:'Profile', path:'/edit-profile' },
    { icon:'💳', label:'Credits & Top Up', shortLabel:'Credits', path:'/my-credits' },
    { icon:'📄', label:'Documents', shortLabel:'Docs', path:'/upload-documents' },
  ];

  const adminTabs = [
    { icon:'🏠', label:'Home', shortLabel:'Home', path:'/home' },
    { icon:'🛡️', label:'Dashboard', shortLabel:'Dashboard', path:'/admin' },
  ];

  const tabs = !user ? [] : user.role==='professional' ? proTabs : user.role==='admin' ? adminTabs : customerTabs;
  const isMobile = window.innerWidth < 480;

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
          <span style={{ fontSize:26 }}>💙</span>
          <span style={{ fontSize:22, fontWeight:800, color:'#1A1A2E', letterSpacing:'-0.5px' }}>Carely</span>
        </Link>

        {user ? (
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ position:'relative', cursor:'pointer' }} onClick={() => navigate('/notifications')}>
              <span style={{ fontSize:22 }}>🔔</span>
              {unread > 0 && (
                <span style={{ position:'absolute', top:-5, right:-5, background:'#EF4444', color:'#fff', borderRadius:'50%', width:18, height:18, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid white' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </div>
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
                    {credits != null && (
                      <div
                        onClick={() => { navigate('/my-credits'); setOpen(false); }}
                        style={{
                          marginTop:10, display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer',
                          padding:'4px 14px', borderRadius:20, fontSize:12, fontWeight:700,
                          background: credits < 5 ? '#FEE2E2' : '#EBF3FF',
                          color: credits < 5 ? '#DC2626' : '#1D4ED8',
                        }}
                      >
                        💳 {credits} credits{credits < 5 ? ' — Top up now' : ''}
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

      {user && tabs.length > 0 && (
        <div
          className="navbar-tabs"
          style={{
            display:'flex', alignItems:'center', padding:'0 28px', height:46,
            overflowX:'auto', scrollbarWidth:'none', msOverflowStyle:'none',
            WebkitOverflowScrolling:'touch', background:'#FAFBFF',
          }}
        >
          {tabs.map(tab => {
            const label = isMobile ? tab.shortLabel : tab.label;
            return (
              <Link key={tab.path} to={tab.path} style={tabStyle(tab.path)}>
                <span>{tab.icon}</span>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      )}

    </nav>
  );
}
