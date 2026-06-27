import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verum",
  description: "Personal daily journal + quotes",
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
  themeColor: "#0b0b0b",
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
