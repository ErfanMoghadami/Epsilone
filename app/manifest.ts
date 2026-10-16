import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Epsilone",
    short_name: "Epsilone",
    description: "Discover and buy beats by mood, sound, and vibe.",
    start_url: "/",
    id: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#121620",
    theme_color: "#121620",
    orientation: "portrait-primary",
    lang: "fa",
    dir: "rtl",
    categories: ["music", "entertainment"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/splash-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/splash-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
