import { RouterProvider } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AppProviders } from "@/app/providers";
import { router } from "@/app/router";

export default function App() {
  return (
    <HelmetProvider>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </HelmetProvider>
  );
}
