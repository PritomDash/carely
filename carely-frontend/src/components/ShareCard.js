import React, { useState } from 'react';

export default function ShareCard({ user }) {
  const [copied, setCopied] = useState(false);
  const referralLink = window.location.origin + '/ref/' + user.referralCode;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareOnFacebook = () => {
    const url = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(referralLink) + '&quote=' + encodeURIComponent('আমি এখন Carely-তে আছি! বাংলাদেশের বিশ্বস্ত কেয়ার মার্কেটপ্লেস। আমাকে বুক করুন। 🏥');
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareOnWhatsApp = () => {
    const msg = 'আমি এখন Carely-তে আছি! Child care, aged care, nursing এবং physiotherapy সার্ভিস বুক করুন। 👇\n' + referralLink;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  return (
    <div style={{ background:'linear-gradient(135deg,#EBF3FF,#F0F7FF)', border:'1.5px solid #BFDBFE', borderRadius:16, padding:24, marginTop:24 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
        <span style={{ fontSize:24 }}>📢</span>
        <h3 style={{ color:'#1E40AF', fontWeight:800, fontSize:18, margin:0 }}>Share & Rank Higher</h3>
      </div>
      <p style={{ color:'#3B5BDB', fontSize:14, marginBottom:18, lineHeight:1.6 }}>
        Share your profile link on Facebook and WhatsApp. Every person who joins Carely using your link
        <strong> boosts your ranking</strong> in search results so more customers find you first.
        When the credit system launches you also earn <strong>1 free credit per referral</strong>.
      </p>

      <div style={{ background:'white', border:'1.5px solid #BFDBFE', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, boxShadow:'0 1px 4px rgba(43,127,255,0.08)' }}>
        <span style={{ fontSize:13, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{referralLink}</span>
        <button onClick={copyLink} style={{ marginLeft:12, padding:'7px 16px', background: copied ? '#22C55E' : '#2B7FFF', color:'white', border:'none', borderRadius:7, fontSize:13, fontWeight:700, cursor:'pointer', flexShrink:0, transition:'background 0.2s' }}>
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>

      <div style={{ display:'flex', gap:12, marginBottom:18 }}>
        <button onClick={shareOnFacebook} style={{ flex:1, padding:'12px 0', background:'#1877F2', color:'white', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer', boxShadow:'0 2px 8px rgba(24,119,242,0.3)' }}>
          📘 Facebook
        </button>
        <button onClick={shareOnWhatsApp} style={{ flex:1, padding:'12px 0', background:'#25D366', color:'white', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer', boxShadow:'0 2px 8px rgba(37,211,102,0.3)' }}>
          💬 WhatsApp
        </button>
      </div>

      <div style={{ display:'flex', gap:0, background:'white', borderRadius:12, overflow:'hidden', border:'1px solid #BFDBFE' }}>
        <div style={{ flex:1, textAlign:'center', padding:'14px 10px', borderRight:'1px solid #BFDBFE' }}>
          <div style={{ fontSize:28, fontWeight:800, color:'#2B7FFF' }}>{user.referralCount || 0}</div>
          <div style={{ fontSize:12, color:'#64748B', fontWeight:500, marginTop:2 }}>Joined via your link</div>
        </div>
        <div style={{ flex:1, textAlign:'center', padding:'14px 10px', borderRight:'1px solid #BFDBFE' }}>
          <div style={{ fontSize:28, fontWeight:800, color:'#7C3AED' }}>{user.referralScore || 0}</div>
          <div style={{ fontSize:12, color:'#64748B', fontWeight:500, marginTop:2 }}>Ranking score</div>
        </div>
        <div style={{ flex:1, textAlign:'center', padding:'14px 10px' }}>
          <div style={{ fontSize:28, fontWeight:800, color:'#16A34A' }}>{user.credits >= 9999 ? '∞' : (user.credits || 0)}</div>
          <div style={{ fontSize:12, color:'#64748B', fontWeight:500, marginTop:2 }}>Credits available</div>
        </div>
      </div>
    </div>
  );
}
