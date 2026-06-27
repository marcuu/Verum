import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Verum",
    short_name: "Verum",
    description: "Personal daily journal and life calendar.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0b0b",
    theme_color: "#0b0b0b",
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
