import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LandingPage from './LandingPage';

// The installed PWA's start_url points here with ?source=pwa so this can
// tell "opened from the home-screen icon" apart from "arrived via a
// browser tab" - a logged-out PWA launch skips the marketing pitch
// straight to login, since the user already installed the app and
// doesn't need to be sold on it again every time they open it.
export default function RootRedirect() {
  const { user, loading } = useAuth();
  const [checked, setChecked] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      new URLSearchParams(window.location.search).get('source') === 'pwa';
    setIsPWA(standalone);
    setChecked(true);
  }, []);

  // Wait for auth to resolve so we never flash the wrong screen.
  if (loading || !checked) return null;

  // Logged in: always go into the app, browser or installed.
  if (user) return <Navigate to="/home" replace />;

  // Not logged in, opened from the installed app: skip the pitch.
  if (isPWA) return <Navigate to="/login" replace />;

  // Not logged in, arrived via browser: show the landing page.
  return <LandingPage />;
}
