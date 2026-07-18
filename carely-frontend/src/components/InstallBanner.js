import React, { useState, useEffect, useCallback } from 'react';
import { Share, MoreVertical, X, Download } from 'lucide-react';
import CarelyLogo from './CarelyLogo';
import { useAuth } from '../context/AuthContext';
import {
  isIOS, isAndroid, isStandalone, canPromptInstall,
  subscribeInstallAvailability, requestInstall,
  isInstallDismissed, dismissInstall, SHOW_INSTRUCTIONS_EVENT,
} from '../utils/pwaInstall';

const SHOW_DELAY_MS = 3000;

export default function InstallBanner() {
  const { user } = useAuth();
  const [standalone] = useState(isStandalone());
  const [canInstall, setCanInstall] = useState(canPromptInstall());
  const [visible, setVisible] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // The logged-in mobile bottom nav bar (AppNavbar) occupies the bottom 64px
  // on narrow viewports and already has its own "Install App" menu item, so
  // lift these fixed-position elements above it there instead of overlapping.
  const mobileNavPresent = !!user && window.innerWidth < 768;
  const bottomOffset = mobileNavPresent ? 76 : 20;

  useEffect(() => {
    if (standalone) return undefined;
    return subscribeInstallAvailability(() => setCanInstall(canPromptInstall()));
  }, [standalone]);

  // Proactively show the banner a few seconds after arriving on mobile, even
  // before beforeinstallprompt has fired (Android sometimes delays it) or
  // for iOS (which never fires it at all - Apple doesn't support the direct
  // install prompt). Desktop keeps the old reactive-only behavior so a
  // browser with no install path at all (e.g. desktop Firefox) never shows a
  // banner it can't act on; it still appears the moment Chrome/Edge fires
  // beforeinstallprompt, since that flips `canInstall` and re-runs this effect.
  useEffect(() => {
    if (standalone || isInstallDismissed()) return undefined;
    if (canInstall) { setVisible(true); return undefined; }
    if (!isIOS() && !isAndroid()) return undefined;
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [standalone, canInstall]);

  useEffect(() => {
    if (standalone) return undefined;
    const onShow = () => setShowInstructions(true);
    window.addEventListener(SHOW_INSTRUCTIONS_EVENT, onShow);
    return () => window.removeEventListener(SHOW_INSTRUCTIONS_EVENT, onShow);
  }, [standalone]);

  const handleInstall = useCallback(async () => {
    const wasInstallable = canPromptInstall();
    const outcome = await requestInstall();
    if (outcome === 'accepted') {
      setVisible(false);
      if (window.gtag) window.gtag('event', 'pwa_install_accepted');
    } else if (!wasInstallable) {
      setShowInstructions(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    setShowInstructions(false);
    dismissInstall();
  };

  if (standalone) return null;

  const anyCardShowing = visible || showInstructions;

  return (
    <>
      {visible && !showInstructions && (
        <div style={{ ...cardStyle, bottom: bottomOffset }}>
          {canInstall ? (
            <>
              <CarelyLogo size={36} />
              <div style={{ flex: 1 }}>
                <div style={titleStyle}>Install Carely App</div>
                <div style={subtitleStyle}>Add to home screen for quick access</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={handleInstall} style={primaryBtnStyle}>Install</button>
                <button onClick={dismiss} style={ghostBtnStyle}>Not now</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ flexShrink: 0 }}>
                {isIOS() ? <Share size={22} color="#2B7FFF" /> : <MoreVertical size={22} color="#2B7FFF" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={titleStyle}>Install Carely App</div>
                <div style={subtitleStyle}>
                  {isIOS()
                    ? 'Tap the Share button, then "Add to Home Screen".'
                    : 'Tap the menu ⋮ button, then "Install app" or "Add to Home screen".'}
                </div>
              </div>
              <button onClick={dismiss} aria-label="Close" style={closeBtnStyle}><X size={18} /></button>
            </>
          )}
        </div>
      )}

      {!anyCardShowing && (
        <button
          onClick={handleInstall}
          aria-label="Install Carely App"
          style={{ ...floatingBtnStyle, bottom: bottomOffset - 2 }}
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
            <div style={titleStyle}>
              {isIOS() ? 'Install Carely on iPhone' : isAndroid() ? 'Install Carely on Android' : 'Install Carely App'}
            </div>
            <div style={{ ...subtitleStyle, marginTop: 6 }}>
              {isIOS() ? (
                <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
                  <li>Tap the Share button <Share size={13} style={{ verticalAlign: 'middle' }} /> at the bottom of Safari</li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Tap "Add"</li>
                </ol>
              ) : isAndroid() ? (
                <>Tap the menu <MoreVertical size={13} style={{ verticalAlign: 'middle' }} /> button (top right), then tap "Install app" or "Add to Home screen".</>
              ) : (
                <>Look for the install icon in your browser's address bar.</>
              )}
            </div>
          </div>
          <button onClick={dismiss} aria-label="Close" style={closeBtnStyle}><X size={18} /></button>
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

const floatingBtnStyle = {
  position: 'fixed', right: 18, zIndex: 998,
  display: 'flex', alignItems: 'center', gap: 6,
  background: '#2B7FFF', color: 'white', border: 'none', borderRadius: 999,
  padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(43,127,255,0.35)',
};

const titleStyle = { fontWeight: 700, fontSize: 15, color: '#1A1A2E' };
const subtitleStyle = { fontSize: 13, color: '#64748B', marginTop: 2, lineHeight: 1.6 };

const primaryBtnStyle = {
  padding: '8px 16px', background: '#2B7FFF', color: 'white', border: 'none',
  borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
};

const ghostBtnStyle = {
  padding: '6px', background: 'none', color: '#94A3B8', border: 'none',
  fontSize: 12, cursor: 'pointer',
};

const closeBtnStyle = {
  background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', flexShrink: 0,
};
