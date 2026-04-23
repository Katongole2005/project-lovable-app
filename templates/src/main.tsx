import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

function isLocalNetworkHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}

function renderFatalErrorOverlay(title: string, detail: string) {
  if (!import.meta.env.DEV) return;

  const existing = document.getElementById("fatal-dev-error-overlay");
  if (existing) {
    existing.querySelector("pre")!.textContent = detail;
    return;
  }

  const overlay = document.createElement("div");
  overlay.id = "fatal-dev-error-overlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "2147483647";
  overlay.style.background = "#05070d";
  overlay.style.color = "#ffb4b4";
  overlay.style.padding = "24px";
  overlay.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  overlay.style.overflow = "auto";

  const heading = document.createElement("h1");
  heading.textContent = title;
  heading.style.margin = "0 0 16px";
  heading.style.fontSize = "20px";
  heading.style.color = "#fff";

  const pre = document.createElement("pre");
  pre.textContent = detail;
  pre.style.whiteSpace = "pre-wrap";
  pre.style.wordBreak = "break-word";
  pre.style.margin = "0";

  overlay.appendChild(heading);
  overlay.appendChild(pre);
  document.body.appendChild(overlay);
}

if (import.meta.env.DEV) {
  window.addEventListener("error", (event) => {
    const detail = event.error?.stack || event.message || "Unknown error";
    renderFatalErrorOverlay("Startup error", detail);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const detail =
      reason instanceof Error
        ? reason.stack || reason.message
        : typeof reason === "string"
          ? reason
          : JSON.stringify(reason, null, 2);

    renderFatalErrorOverlay("Unhandled promise rejection", detail);
  });
}

createRoot(document.getElementById("root")!).render(<App />);

const shouldDisableServiceWorker =
  import.meta.env.DEV || isLocalNetworkHost(window.location.hostname);

if (shouldDisableServiceWorker && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().catch(() => {});
      });
    });

    if ("caches" in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          caches.delete(key).catch(() => {});
        });
      });
    }
  });
}

if (!shouldDisableServiceWorker && "serviceWorker" in navigator) {
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
