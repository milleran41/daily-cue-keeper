import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

const isSwSupported =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  (window.isSecureContext || window.location.hostname === 'localhost');

if (isSwSupported) {
  try {
    registerSW({
      immediate: true,
      onRegisterError(error) {
        console.warn('Service worker registration failed:', error);
      },
    });
  } catch (e) {
    console.warn('Service worker registration threw:', e);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
