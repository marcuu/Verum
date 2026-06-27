import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verum",
  description: "Personal daily journal + quotes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body>{children}</body>
    </html>
  );
}
