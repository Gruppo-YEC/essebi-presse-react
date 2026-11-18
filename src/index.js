import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    /*<React.StrictMode>*/
        <HelmetProvider>
            <App />
        </HelmetProvider>
    /*</React.StrictMode>*/
);

/**
 * Rimuove i service worker registrati dalle versioni CRA del framework.
 * Senza questo, i browser che hanno ancora un SW attivo continuerebbero a servire
 * l'app dalla cache vecchia anche dopo un nuovo deploy. Da non rimuovere.
 */
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
        .then((registrations) => registrations.forEach((registration) => registration.unregister()))
        .catch(() => {});
}
