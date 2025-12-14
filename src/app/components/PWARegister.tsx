"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // DISABLE service worker completely in development to prevent CSS blocking
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Unregister ALL service workers in development
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister();
            console.log("🔄 Unregistered service worker for development");
          });
          // Clear ALL caches
          caches.keys().then((names) => {
            names.forEach((name) => {
              caches.delete(name);
              console.log("🗑️ Cleared cache:", name);
            });
          });
        });
        // Don't register service worker in development
        return;
      }
      
      // Register new service worker
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: 'none' })
        .then((registration) => {
          console.log("✅ Service Worker registered:", registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            console.log("🔄 Service Worker update found");
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log("🔄 New service worker available - refresh to update");
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("❌ Service Worker registration failed:", error);
        });
      
      // Listen for service worker ready
      navigator.serviceWorker.ready.then(() => {
        console.log("✅ Service Worker ready - offline support active!");
      });
    } else {
      console.warn("⚠️ Service Workers not supported in this browser");
    }
  }, []);

  return null;
}


