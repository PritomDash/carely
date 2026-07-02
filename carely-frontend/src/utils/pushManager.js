const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const setupPushNotifications = async (authToken) => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Push permission denied');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;

    const keyRes = await fetch(API_BASE + '/api/users/vapid-public-key');
    const { publicKey } = await keyRes.json();
    if (!publicKey) return false;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    await fetch(API_BASE + '/api/users/push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authToken,
      },
      body: JSON.stringify({ subscription }),
    });

    console.log('Push notifications set up successfully');
    return true;
  } catch (err) {
    console.error('Push setup error:', err.message);
    return false;
  }
};
