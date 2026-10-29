import React from 'react';
import ReactDOM from 'react-dom/client';
import 'mana-font/css/mana.css';
import './styles/keyrune-custom.css';
import App from './App';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

// Si se define VITE_API_URL (por ejemplo en Netlify/Vercel apuntando al backend en Render),
// enrutar automáticamente todas las llamadas /api/* hacia la URL remota
const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, '');
if (apiBase) {
  const originalFetch = window.fetch;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      input = `${apiBase}${input}`;
    }
    return originalFetch(input, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>,
);
