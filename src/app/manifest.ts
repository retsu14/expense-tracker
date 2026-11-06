import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Oink — Expense & Budget Tracker",
    short_name: "Oink",
    description: "Track expenses, plan budgets and save with Oink the pig.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#141414",
    theme_color: "#141414",
    lang: "en-PH",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Add transaction",
        short_name: "Add",
        url: "/?add=1",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Activity",
        url: "/activity",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      { name: "Budgets", url: "/plan", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
