import React from 'react';
import ReactDOM from 'react-dom/client';
import 'mana-font/css/mana.css';
import 'keyrune/css/keyrune.css';
import App from './App';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>,
);
