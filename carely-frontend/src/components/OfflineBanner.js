import React, { useState, useEffect } from 'react';

// Bangladesh mobile data can drop out mid-session - showing a clear banner
// instead of letting every in-flight request silently fail/timeout is the
// difference between "the app is broken" and "I know what's wrong".
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#991B1B', color: '#fff', textAlign: 'center',
      padding: '8px 16px', fontSize: 13, fontWeight: 600,
    }}>
      You are offline. Some features may not work until your connection is back.
    </div>
  );
}
