import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Render the app first to avoid blocking page load
const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Handle service worker registration after the app has rendered
if ("serviceWorker" in navigator) {
  // Add a timeout to prevent hanging
  const swTimeout = setTimeout(() => {
    console.warn(
      "Service worker registration timed out, continuing without it"
    );
    // Store a flag in localStorage to indicate service worker failed
    localStorage.setItem("sw-failed", "true");
  }, 3000);

  // Try unregistering any existing service workers
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      // If there are no registrations, just clear the timeout
      if (registrations.length === 0) {
        clearTimeout(swTimeout);
        localStorage.removeItem("sw-failed");
        return;
      }

      // Unregister all existing service workers
      const unregisterPromises = registrations.map((registration) =>
        registration.unregister().catch((error) => {
          console.error("Failed to unregister service worker:", error);
          return false;
        })
      );

      Promise.all(unregisterPromises)
        .then(() => {
          clearTimeout(swTimeout);
          localStorage.removeItem("sw-failed");
          console.log("Service worker cleanup complete");
        })
        .catch((error) => {
          clearTimeout(swTimeout);
          console.error("Service worker cleanup failed:", error);
          localStorage.setItem("sw-failed", "true");
        });
    })
    .catch((error) => {
      clearTimeout(swTimeout);
      console.error("Failed to get service worker registrations:", error);
      localStorage.setItem("sw-failed", "true");
    });
}
