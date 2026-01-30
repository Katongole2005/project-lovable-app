import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  });
}

// Basic client-side deterrents (can be bypassed, but stops casual use)
document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const isCtrl = event.ctrlKey || event.metaKey;
  const isShift = event.shiftKey;

  // Block common devtools shortcuts: F12, Ctrl+Shift+I/J/C, Ctrl+U
  if (event.key === "F12") {
    event.preventDefault();
  }
  if (isCtrl && isShift && (key === "i" || key === "j" || key === "c")) {
    event.preventDefault();
  }
  if (isCtrl && key === "u") {
    event.preventDefault();
  }
});
