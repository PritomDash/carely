// Centralizes PWA install state so every "Install App" entry point in the
// app (floating banner, navbar/bottom-sheet menu item, landing page button)
// shares one beforeinstallprompt capture instead of racing separate
// listeners, and so non-Chromium platforms (iOS Safari never fires
// beforeinstallprompt at all) still get a manual instruction path.
let deferredPrompt = null;
let listeners = [];

const notify = () => listeners.forEach((fn) => fn());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  notify();
});

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
export const isAndroid = () => /Android/.test(navigator.userAgent);
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

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
  notify();
  return outcome;
};

// The one function every "Install App" button/menu item should call. Uses
// the native prompt when Chrome/Edge/Android has made one available;
// otherwise asks the app-root InstallBanner to show the manual
// instruction card (iOS Safari, or Android before the browser has offered
// a prompt yet).
export const requestInstall = async () => {
  if (deferredPrompt) return triggerNativeInstall();
  window.dispatchEvent(new CustomEvent('carely-show-install-instructions'));
  return null;
};

export const SHOW_INSTRUCTIONS_EVENT = 'carely-show-install-instructions';
