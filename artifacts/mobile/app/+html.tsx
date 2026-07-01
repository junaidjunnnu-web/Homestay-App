import { ScrollViewStyleReset } from "expo-router/html";
import type React from "react";

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <title>Homestay App</title>
        <meta name="application-name" content="Homestay App" />
        <meta name="description" content="Manage and book beautiful Indian homestays" />

        {/* PWA manifest & theme */}
        <meta name="theme-color" content="#E8824A" />
        <link rel="manifest" href="/manifest.json" />

        {/* iOS Safari PWA: must be EXACTLY these two to show 'Add to Home Screen' install banner */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Homestay" />

        {/* iOS icons (fallback from icon.png) */}
        <link rel="apple-touch-icon" href="/icon.png" />

        {/* Service worker for installable PWA (Android Chrome + offline shell) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function () {});
                });
              }
            `,
          }}
        />

        {/* Remove scroll bounce / overscroll */}
        <ScrollViewStyleReset />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root { height: 100%; margin: 0; padding: 0; }
              body { overflow: hidden; }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
