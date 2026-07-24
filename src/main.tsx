import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Overlay needs a clear webview; settings/editor keep the charcoal canvas.
const view = new URLSearchParams(window.location.search).get("view") || "settings";
document.documentElement.dataset.view = view;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
