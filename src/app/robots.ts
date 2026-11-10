import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

const PRIVATE = [
  "/api/",
  "/activity",
  "/accounts",
  "/assistant",
  "/dev",
  "/import",
  "/insights",
  "/notifications",
  "/onboarding",
  "/plan",
  "/settings",
  "/trash",
  "/forgot-password",
  "/offline",
  "/welcome",
];

const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  const rule = { allow: ["/", "/llms.txt", "/llms-full.txt"], disallow: PRIVATE };
  return {
    rules: [
      { userAgent: "*", ...rule },
      { userAgent: AI_CRAWLERS, ...rule },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
