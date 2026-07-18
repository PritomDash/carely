// Centralizes PWA install state so every "Install App" entry point in the
// app (floating banner, navbar/bottom-sheet menu item, landing page button)
// reads from one place instead of racing separate listeners, and so
// non-Chromium platforms (iOS Safari never fires beforeinstallprompt at
// all) still get a manual instruction path.
//
// The actual beforeinstallprompt capture happens in an inline <script> in
// public/index.html, in <head>, before the React bundle even starts
// downloading - that's the earliest point a listener can possibly attach.
// This module only ever *reads* window.__deferredInstallPrompt; it does
// not register its own competing beforeinstallprompt listener.
export const SHOW_INSTRUCTIONS_EVENT = 'carely-show-install-instructions';
const CAN_INSTALL_EVENT = 'carely-can-install';

let installed = false;
let listeners = [];

const notify = () => listeners.forEach((fn) => fn());

window.addEventListener(CAN_INSTALL_EVENT, notify);
window.addEventListener('appinstalled', () => {
  installed = true;
  notify();
  if (window.gtag) window.gtag('event', 'pwa_install', { method: 'browser_prompt' });
});

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
export const isAndroid = () => /Android/.test(navigator.userAgent);
export const isStandalone = () =>
  installed ||
  window.matchMedia('(display-mode: standalone)').matches ||
  !!window.navigator.standalone;

export const canPromptInstall = () => !!window.__deferredInstallPrompt;

// Subscribe to changes in install availability (prompt captured, or app
// installed). Returns an unsubscribe function.
export const subscribeInstallAvailability = (fn) => {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
};

const triggerNativeInstall = async () => {
  const promptEvent = window.__deferredInstallPrompt;
  if (!promptEvent) return null;
  promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  window.__deferredInstallPrompt = null;
  if (outcome === 'accepted') installed = true;
  notify();
  return outcome;
};

// The one function every "Install App" button/menu item should call. Uses
// the native prompt when Chrome/Edge/Android has made one available (Android
// and desktop then install with a single tap, same as the browser's own
// prompt); otherwise asks the app-root InstallBanner to show the manual
// instruction card - the only option on iOS Safari, which never fires
// beforeinstallprompt at all (an Apple platform restriction, not something
// any web code can work around).
export const requestInstall = async () => {
  if (window.__deferredInstallPrompt) return triggerNativeInstall();
  window.dispatchEvent(new CustomEvent(SHOW_INSTRUCTIONS_EVENT));
  return null;
};

// Session-scoped dismissal. Deliberately not localStorage - some mobile
// browsers throw on localStorage access in private/locked-down modes, and
// it's fine for the banner to reappear on the next visit anyway.
const DISMISS_KEY = 'carely-pwa-install-dismissed';
export const isInstallDismissed = () => {
  try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
};
export const dismissInstall = () => {
  try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
};
