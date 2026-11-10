import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

import { llmsFull, llmsSummary } from "./llms";
import { FAQ, SITE_URL } from "./site";

describe("seo files", () => {
  it("keeps private pages out of search but welcomes AI crawlers", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const all = rules.find((x) => x.userAgent === "*");
    expect(all?.disallow).toContain("/settings");
    expect(all?.allow).toContain("/");
    expect(rules.some((x) => Array.isArray(x.userAgent) && x.userAgent.includes("GPTBot"))).toBe(
      true,
    );
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it("lists only public pages in the sitemap", () => {
    const urls = sitemap().map((e) => e.url.replace(SITE_URL, ""));
    expect(urls).toEqual(["/", "/register", "/login", "/privacy"]);
  });

  it("summarizes the product for LLMs", () => {
    expect(llmsSummary()).toMatch(/^# Oink\n\n> /);
    expect(llmsSummary()).toContain(`${SITE_URL}/llms-full.txt`);
    for (const f of FAQ) expect(llmsFull()).toContain(f.q);
  });
});
