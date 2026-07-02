import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// The record's serif, self-hosted so it renders identically on every
// platform (the old Iowan Old Style/Palatino stack was Apple-only) and
// keeps working offline in the installed PWA.
const newsreader = localFont({
  src: [
    {
      path: "./fonts/newsreader-latin.woff2",
      weight: "200 800",
      style: "normal",
    },
    {
      path: "./fonts/newsreader-latin-italic.woff2",
      weight: "200 800",
      style: "italic",
    },
  ],
  variable: "--font-newsreader",
  display: "swap",
  fallback: ["Iowan Old Style", "Palatino Linotype", "Georgia", "serif"],
});

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
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#12100d" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={newsreader.variable}>
      <body>{children}</body>
    </html>
  );
}
