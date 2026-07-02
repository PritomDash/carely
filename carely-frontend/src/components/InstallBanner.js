import React, { useState, useEffect } from 'react';

export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('pwa-dismissed')) return;
    const handler = (e) => { e.preventDefault(); setPrompt(e); setShow(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setShow(false);
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-dismissed', '1');
  };

  if (!show) return null;

  return (
    <div style={{
      position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)',
      background:'white', border:'1.5px solid #BFDBFE', borderRadius:16,
      padding:'16px 20px', boxShadow:'0 8px 32px rgba(43,127,255,0.20)',
      display:'flex', alignItems:'center', gap:14,
      zIndex:999, maxWidth:380, width:'90%'
    }}>
      <span style={{ fontSize:36 }}>💙</span>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:700, fontSize:15, color:'#1A1A2E' }}>Install Carely App</div>
        <div style={{ fontSize:13, color:'#64748B', marginTop:2 }}>Add to home screen for quick access</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        <button onClick={install} style={{ padding:'8px 16px', background:'#2B7FFF', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }}>Install</button>
        <button onClick={dismiss} style={{ padding:'6px', background:'none', color:'#94A3B8', border:'none', fontSize:12, cursor:'pointer' }}>Not now</button>
      </div>
    </div>
  );
}
