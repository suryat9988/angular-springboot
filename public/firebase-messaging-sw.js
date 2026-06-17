importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyD3ddoyJZ_kU_TYG0llk9E79exSrjKF3j8',
  authDomain: 'bowerbox-ced3b.firebaseapp.com',
  projectId: 'bowerbox-ced3b',
  storageBucket: 'bowerbox-ced3b.firebasestorage.app',
  messagingSenderId: '459869442695',
  appId: '1:459869442695:web:dbd293f32c7af9bd119e22',
  measurementId: 'G-4949X6VK3D'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'BowerBox reminder';
  const options = {
    body: payload.notification?.body || 'You have an upcoming date planned.',
    icon: '/bowerbird-logo.svg'
  };

  self.registration.showNotification(title, options);
});
