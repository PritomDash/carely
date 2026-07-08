import React, { useState, useEffect, useCallback } from 'react';
import { Share, MoreVertical, X, Download } from 'lucide-react';
import CarelyLogo from './CarelyLogo';
import { useAuth } from '../context/AuthContext';
import {
  isIOS, isAndroid, isStandalone, canPromptInstall,
  subscribeInstallAvailability, requestInstall, SHOW_INSTRUCTIONS_EVENT,
} from '../utils/pwaInstall';

export default function InstallBanner() {
  const { user } = useAuth();
  const [standalone] = useState(isStandalone());
  const [showAutoBanner, setShowAutoBanner] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  // The logged-in mobile bottom nav bar (AppNavbar) occupies the bottom 64px
  // on narrow viewports and already has its own "Install App" menu item, so
  // lift these fixed-position elements above it there instead of overlapping.
  const mobileNavPresent = !!user && window.innerWidth < 768;
  const bottomOffset = mobileNavPresent ? 76 : 20;

  useEffect(() => {
    if (standalone) return undefined;
    const onChange = () => {
      if (canPromptInstall() && !localStorage.getItem('pwa-dismissed')) setShowAutoBanner(true);
    };
    onChange();
    return subscribeInstallAvailability(onChange);
  }, [standalone]);

  useEffect(() => {
    if (standalone) return undefined;
    const onShowInstructions = () => setShowInstructions(true);
    window.addEventListener(SHOW_INSTRUCTIONS_EVENT, onShowInstructions);
    return () => window.removeEventListener(SHOW_INSTRUCTIONS_EVENT, onShowInstructions);
  }, [standalone]);

  const install = useCallback(async () => {
    const outcome = await requestInstall();
    if (outcome === 'accepted') setShowAutoBanner(false);
  }, []);

  const dismissAutoBanner = () => {
    setShowAutoBanner(false);
    localStorage.setItem('pwa-dismissed', '1');
  };

  if (standalone) return null;

  return (
    <>
      {showAutoBanner && (
        <div style={{ ...cardStyle, bottom: bottomOffset }}>
          <CarelyLogo size={36} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>Install Carely App</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Add to home screen for quick access</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={install} style={primaryBtnStyle}>Install</button>
            <button onClick={dismissAutoBanner} style={ghostBtnStyle}>Not now</button>
          </div>
        </div>
      )}

      {!showAutoBanner && !showInstructions && (
        <button
          onClick={install}
          aria-label="Install Carely App"
          style={{
            position: 'fixed', bottom: bottomOffset - 2, right: 18, zIndex: 998,
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#2B7FFF', color: 'white', border: 'none', borderRadius: 999,
            padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(43,127,255,0.35)',
          }}
        >
          <Download size={15} /> Install App
        </button>
      )}

      {showInstructions && (
        <div style={{ ...cardStyle, bottom: bottomOffset, alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0, marginTop: 2 }}>
            {isIOS() ? <Share size={22} color="#2B7FFF" /> : <MoreVertical size={22} color="#2B7FFF" />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>Install Carely App</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 1.6 }}>
              {isIOS()
                ? <>Tap the <Share size={13} style={{ verticalAlign: 'middle', margin: '0 2px' }} /> Share button, then "Add to Home Screen".</>
                : isAndroid()
                  ? <>Tap the menu <MoreVertical size={13} style={{ verticalAlign: 'middle', margin: '0 2px' }} /> button, then "Add to Home screen".</>
                  : <>Look for the install icon in your browser's address bar.</>}
            </div>
          </div>
          <button onClick={() => setShowInstructions(false)} aria-label="Close" style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
}

const cardStyle = {
  position: 'fixed', left: '50%', transform: 'translateX(-50%)',
  background: 'white', border: '1.5px solid #BFDBFE', borderRadius: 16,
  padding: '16px 20px', boxShadow: '0 8px 32px rgba(43,127,255,0.20)',
  display: 'flex', alignItems: 'center', gap: 14,
  zIndex: 999, maxWidth: 380, width: '90%',
};

const primaryBtnStyle = {
  padding: '8px 16px', background: '#2B7FFF', color: 'white', border: 'none',
  borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
};

const ghostBtnStyle = {
  padding: '6px', background: 'none', color: '#94A3B8', border: 'none',
  fontSize: 12, cursor: 'pointer',
};
