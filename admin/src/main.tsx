import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import AOS from 'aos'
import "aos/dist/aos.css";

AOS.init({});

createRoot(document.getElementById('root')!).render(
    <div>
        <App />
    </div>
);
