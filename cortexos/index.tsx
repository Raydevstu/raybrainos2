// index.tsx — CortexOS entry point (Vite / AI Studio runtime)
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('CortexOS: #root element missing from index.html');

createRoot(rootEl).render(<App />);
