import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './SimpleJourney';
import '../app/globals.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
