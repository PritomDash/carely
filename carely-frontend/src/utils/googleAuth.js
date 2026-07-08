export const handleGoogleLogin = (navigate, setError) => {
  const BACKEND = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

  const popup = window.open(
    BACKEND + '/api/auth/google?origin=' + encodeURIComponent(window.location.origin),
    'google-auth-popup',
    'width=500,height=600,scrollbars=yes,resizable=yes,left=' +
    (window.screen.width / 2 - 250) + ',top=' +
    (window.screen.height / 2 - 300)
  );

  if (!popup) {
    if (setError) setError('Popup blocked. Please allow popups for this site.');
    return;
  }

  const handleMessage = (event) => {
    if (event.origin !== (process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000')) {
      if (!event.origin.includes('carely-backend-j4dn.onrender.com') &&
          !event.origin.includes('localhost:5000')) return;
    }

    if (event.data?.token && event.data?.user) {
      localStorage.setItem('carelyToken', event.data.token);
      localStorage.setItem('carelyUser', JSON.stringify(event.data.user));
      window.dispatchEvent(new Event('carely-auth-changed'));
      window.removeEventListener('message', handleMessage);
      if (popup && !popup.closed) popup.close();
      navigate('/home');
    }
  };

  window.addEventListener('message', handleMessage);

  const checkClosed = setInterval(() => {
    if (popup?.closed) {
      clearInterval(checkClosed);
      window.removeEventListener('message', handleMessage);
    }
  }, 500);
};
