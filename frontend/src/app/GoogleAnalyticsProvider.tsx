import { useEffect } from "react";
import { router } from "@/app/router";
import { initGoogleTag, trackPageView } from "@/shared/lib/gtag";

/** Loads Google Tag and sends page_view on SPA route changes. */
export function GoogleAnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initGoogleTag();
    trackPageView(window.location.pathname + window.location.search);

    return router.subscribe((state) => {
      const { pathname, search } = state.location;
      trackPageView(pathname + search);
    });
  }, []);

  return children;
}
