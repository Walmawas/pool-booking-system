import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import FirebaseConfigError from './components/FirebaseConfigError';
import { firebaseBootstrap } from './firebase';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {firebaseBootstrap.ok ? (
      <HelmetProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </BrowserRouter>
      </HelmetProvider>
    ) : (
      <FirebaseConfigError missingKeys={firebaseBootstrap.missingKeys} />
    )}
  </React.StrictMode>
);
