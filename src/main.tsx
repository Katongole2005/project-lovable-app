import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Check for updates immediately on every app open
      reg.update().catch(() => {});

      // Also check periodically while the app is open (every 60s)
      setInterval(() => reg.update().catch(() => {}), 60 * 1000);

      // When a new SW is found, prompt reload to avoid stale cache
      const handleNewWorker = (worker: ServiceWorker) => {
        worker.addEventListener("statechange", () => {
          if (worker.state === "activated" && navigator.serviceWorker.controller) {
            window.location.reload();
          }
        });
      };

      // If there's already a waiting worker (update found before page load)
      if (reg.waiting) {
        reg.waiting.postMessage("skipWaiting");
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (newWorker) {
          handleNewWorker(newWorker);
        }
      });
    }).catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  });
}
