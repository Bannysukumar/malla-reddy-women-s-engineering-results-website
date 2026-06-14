import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { GoogleAnalyticsProvider } from "@/app/GoogleAnalyticsProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <GoogleAnalyticsProvider>{children}</GoogleAnalyticsProvider>
    </QueryClientProvider>
  );
}
