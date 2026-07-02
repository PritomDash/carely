import React from 'react';

export default function AppFooter() {
  return (
    <footer style={{ background:'#1A1A2E', color:'white', padding:'48px 28px 28px' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:40, marginBottom:40 }}>

          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <span style={{ fontSize:24 }}>💙</span>
              <span style={{ fontSize:20, fontWeight:800 }}>Carely</span>
            </div>
            <p style={{ color:'#94A3B8', fontSize:14, lineHeight:1.8, marginBottom:16 }}>
              Bangladesh's trusted marketplace connecting families with verified care professionals.
              Child care, aged care, nursing, and physiotherapy services across Bangladesh.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" style={{ width:36, height:36, background:'#1877F2', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', fontSize:16 }}>📘</a>
              <a href="https://wa.me" target="_blank" rel="noreferrer" style={{ width:36, height:36, background:'#25D366', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', fontSize:16 }}>💬</a>
            </div>
          </div>

          <div>
            <h4 style={{ fontWeight:700, marginBottom:16, fontSize:15 }}>Services</h4>
            {['Child Care','Aged Care','Nurse','Physiotherapist'].map(s => (
              <div key={s} style={{ color:'#94A3B8', fontSize:14, marginBottom:8, cursor:'pointer' }}>{s}</div>
            ))}
          </div>

          <div>
            <h4 style={{ fontWeight:700, marginBottom:16, fontSize:15 }}>Company</h4>
            {[
              { label:'Home', path:'/' },
              { label:'Find Professionals', path:'/home' },
              { label:'Post a Job', path:'/create-job-post' },
              { label:'Register', path:'/register' },
            ].map(l => (
              <a key={l.path} href={l.path} style={{ display:'block', color:'#94A3B8', fontSize:14, marginBottom:8, textDecoration:'none' }}>{l.label}</a>
            ))}
          </div>

          <div>
            <h4 style={{ fontWeight:700, marginBottom:16, fontSize:15 }}>Legal</h4>
            {[
              { label:'Terms & Conditions', path:'/terms' },
              { label:'Privacy Policy', path:'/privacy' },
            ].map(l => (
              <a key={l.path} href={l.path} style={{ display:'block', color:'#94A3B8', fontSize:14, marginBottom:8, textDecoration:'none' }}>{l.label}</a>
            ))}
            <div style={{ marginTop:16, padding:'12px 14px', background:'#FEF2F2', borderRadius:8 }}>
              <p style={{ color:'#991B1B', fontSize:12, lineHeight:1.6, margin:0, fontWeight:500 }}>
                ⚠️ Carely is a marketplace only. Always verify professionals yourself. Not responsible for service outcomes.
              </p>
            </div>
          </div>

        </div>

        <div style={{ borderTop:'1px solid #2D3748', paddingTop:24, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <p style={{ color:'#64748B', fontSize:13, margin:0 }}>© 2025 Carely Bangladesh. All rights reserved.</p>
          <p style={{ color:'#64748B', fontSize:13, margin:0 }}>Made with 💙 for Bangladesh</p>
        </div>
      </div>
    </footer>
  );
}
