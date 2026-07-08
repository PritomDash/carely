// Centralizes PWA install state so every "Install App" entry point in the
// app (floating banner, navbar/bottom-sheet menu item, landing page button)
// shares one beforeinstallprompt capture instead of racing separate
// listeners, and so non-Chromium platforms (iOS Safari never fires
// beforeinstallprompt at all) still get a manual instruction path.
export const SHOW_INSTRUCTIONS_EVENT = 'carely-show-install-instructions';

let deferredPrompt = null;
let installed = false;
let listeners = [];

const notify = () => listeners.forEach((fn) => fn());

// Captured as early as possible (module runs once at app load, before any
// component mounts) so the prompt is already available the first time a
// user taps any install button, on Android and desktop Chrome/Edge alike.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  installed = true;
  notify();
});

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
export const isAndroid = () => /Android/.test(navigator.userAgent);
export const isStandalone = () =>
  installed ||
  window.matchMedia('(display-mode: standalone)').matches ||
  !!window.navigator.standalone;

export const canPromptInstall = () => !!deferredPrompt;

// Subscribe to changes in install availability (prompt captured, or app
// installed). Returns an unsubscribe function.
export const subscribeInstallAvailability = (fn) => {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
};

const triggerNativeInstall = async () => {
  const promptEvent = deferredPrompt;
  if (!promptEvent) return null;
  promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  deferredPrompt = null;
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
  if (deferredPrompt) return triggerNativeInstall();
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
