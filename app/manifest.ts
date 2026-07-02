import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Verum",
    short_name: "Verum",
    description: "An honest daily record set against the weeks you have left.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Aligned with the CSS dark --bg so the installed splash reads as the app.
    background_color: "#0c0c0c",
    theme_color: "#0c0c0c",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
