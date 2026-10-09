import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./massive-black-card.css";
import "./components/web3/home-palette.css";
import "./components/vestflow/flow-palette.css";
import "./components/weekly/layout-repairs.css";
import "./components/web3/home-atmosphere.css";

// A deployment can replace a lazy route chunk while an older tab is open.
// Recover once per minute, retaining the requested route without a reload loop.
window.addEventListener('vite:preloadError', event => {
  if (!['', '#', '#leaderboard', '#flow', '#vestflow'].includes(window.location.hash.split('?')[0])) return;
  try {
    const key = 'massive-chunk-recovery';
    const previous = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - previous < 60000) return;
    sessionStorage.setItem(key, String(Date.now()));
    event.preventDefault();
    window.location.reload();
  } catch { /* Let the original error surface if storage is unavailable. */ }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import "./components/design/flat-theme.css";
