import React from 'react';
import AppNavbar from '../components/AppNavbar';
import AppFooter from '../components/AppFooter';

const APK_URL = 'https://github.com/PritomDash/carely/releases/latest/download/Carely.apk';

const handleDownload = () => {
  const a = document.createElement('a');
  a.href = APK_URL;
  a.setAttribute('download', 'Carely.apk');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export default function DownloadPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />

      <div style={{ background: 'linear-gradient(135deg,#0F172A,#1E293B)', padding: '64px 28px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>

          <div style={{ fontSize: 14, fontWeight: 700, color: '#60A5FA', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            GET THE APP
          </div>
          <h1 style={{ color: 'white', fontSize: 34, fontWeight: 800, marginBottom: 12, lineHeight: 1.2 }}>
            Download Carely for Android
          </h1>
          <p style={{ color: '#94A3B8', fontSize: 16, marginBottom: 40, maxWidth: 480, margin: '0 auto 40px' }}>
            Install the Carely app directly on your Android phone. No Play Store needed.
          </p>

          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '40px 28px', maxWidth: 420, margin: '0 auto', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🤖</div>
            <h2 style={{ color: 'white', fontWeight: 800, fontSize: 22, marginBottom: 20 }}>Carely Android App</h2>

            <button
              onClick={handleDownload}
              style={{
                display: 'block', width: '100%', padding: '16px 0', background: 'linear-gradient(135deg,#2B7FFF,#60A5FA)',
                color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(43,127,255,0.4)',
              }}
            >
              ⬇️ Download Free App
            </button>

            <div style={{ marginTop: 14, fontSize: 13, color: '#94A3B8' }}>
              Android 7.0+ • Free • ~5MB
            </div>
          </div>

          <div style={{ marginTop: 32, padding: '16px 24px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, display: 'inline-block' }}>
            <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
              🔜 Coming soon to Google Play Store
            </p>
          </div>

        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '48px 20px' }}>
        <h3 style={{ marginBottom: 16, color: '#1A1A2E' }}>Installation Steps</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            'Tap "Download Free App" above to download Carely.apk',
            'Open the downloaded file from your notifications or downloads folder',
            'If prompted, allow installation from this source',
            'Tap Install and open Carely once installation completes',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: '#374151', fontSize: 14 }}>
              <span style={{ color: '#2B7FFF', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
              {step}
            </div>
          ))}
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
