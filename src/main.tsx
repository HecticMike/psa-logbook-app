import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Check again when an installed app returns to the foreground. The PWA plugin
// reloads the page when an updated worker takes control.
registerSW({
  immediate: true,
  onRegisteredSW(_workerUrl, registration) {
    if (!registration) return;
    const checkForUpdate = () => {
      if (navigator.onLine) void registration.update().catch(() => {});
    };
    window.addEventListener('focus', checkForUpdate);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkForUpdate();
    });
    checkForUpdate();
  }
});

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
