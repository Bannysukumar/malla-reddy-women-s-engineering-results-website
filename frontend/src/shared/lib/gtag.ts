declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/** Google Tag — "malla reddy results website" */
export const GTAG_ID = import.meta.env.VITE_GTAG_ID || "GT-MJP8TXD7";

/** GA4 measurement ID (destination) */
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-MMGG20Z3E8";

export const GA_TAG_NAME = import.meta.env.VITE_GA_TAG_NAME || "malla reddy results website";

let initialized = false;

export function initGoogleTag(): void {
  if (initialized || !GTAG_ID) return;
  initialized = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag("js", new Date());

  if (!document.getElementById("google-tag-script")) {
    const script = document.createElement("script");
    script.id = "google-tag-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`;
    document.head.appendChild(script);
  }

  window.gtag("config", GTAG_ID, {
    send_page_view: false,
  });
}

export function trackPageView(path: string, title?: string): void {
  if (!initialized || typeof window.gtag !== "function") return;

  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title || document.title,
    send_to: GTAG_ID,
  });
}

export function trackEvent(name: string, params?: Record<string, string | number | boolean>): void {
  if (!initialized || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}
