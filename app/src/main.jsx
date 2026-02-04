import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { debugLog } from './utils/debug';
import './index.css';

// Render the React app to the DOM, wrapped in ErrorBoundary for graceful error handling
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>
);

debugLog('[Providence Onboarding] App initialized');
