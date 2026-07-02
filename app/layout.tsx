import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verum",
  description: "An honest daily record set against the weeks you have left.",
  // iOS web push only works from a Home-Screen-installed PWA, so give it the
  // standalone hints and touch icon it needs for a clean install.
  appleWebApp: {
    capable: true,
    title: "Verum",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  // Match the app's actual paper: the browser/PWA chrome should read as part
  // of the page in both schemes, not a fixed dark band over a white journal.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0c" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
