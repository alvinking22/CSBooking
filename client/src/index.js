import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    const shouldUpdate = window.confirm(
      'Hay una nueva version de CS Booking disponible. ¿Deseas actualizar ahora?'
    );
    if (shouldUpdate && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  },
});
