import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './pages/App.css'
import './index.css'
import { initStore } from './data/store'
import { BrowserRouter } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';

console.log(">>> BOOTING SHULESOFT MAIN.JSX");

initStore();

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <ScrollToTop />
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
} else {
  console.error("CRITICAL: Root element not found!");
}
