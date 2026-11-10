import { ImageResponse } from "next/og";

import { SITE } from "@/lib/site";

export const alt = "Oink — free expense and budget tracker for the Philippines";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function PigFace() {
  return (
    <svg width="420" height="420" viewBox="0 0 200 200">
      <ellipse cx="100" cy="190" rx="70" ry="6" fill="#000" opacity="0.25" />
      <path d="M44 66 C30 34 40 16 56 20 C70 24 80 42 80 58 Z" fill="#f4a7b9" />
      <path d="M52 56 C46 40 50 30 57 32 C64 34 70 46 70 54 Z" fill="#e8879e" />
      <path d="M156 66 C170 34 160 16 144 20 C130 24 120 42 120 58 Z" fill="#f4a7b9" />
      <path d="M148 56 C154 40 150 30 143 32 C136 34 130 46 130 54 Z" fill="#e8879e" />
      <ellipse cx="100" cy="150" rx="60" ry="38" fill="#f4a7b9" />
      <ellipse cx="100" cy="158" rx="36" ry="21" fill="#fff" opacity="0.22" />
      <ellipse cx="100" cy="94" rx="68" ry="60" fill="#f4a7b9" />
      <ellipse cx="68" cy="58" rx="16" ry="8" fill="#fff" opacity="0.3" />
      <ellipse cx="54" cy="112" rx="14" ry="9" fill="#e8879e" opacity="0.75" />
      <ellipse cx="146" cy="112" rx="14" ry="9" fill="#e8879e" opacity="0.75" />
      <ellipse cx="76" cy="90" rx="9" ry="11" fill="#2b1d22" />
      <ellipse cx="124" cy="90" rx="9" ry="11" fill="#2b1d22" />
      <circle cx="79" cy="86" r="3.4" fill="#fff" />
      <circle cx="127" cy="86" r="3.4" fill="#fff" />
      <ellipse cx="100" cy="116" rx="23" ry="16" fill="#e8879e" />
      <ellipse cx="92" cy="117" rx="4" ry="5.6" fill="#8a3f52" />
      <ellipse cx="108" cy="117" rx="4" ry="5.6" fill="#8a3f52" />
      <path d="M87 134 Q100 152 113 134 Z" fill="#8a3f52" />
    </svg>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 90px",
        background: "radial-gradient(circle at 78% 40%, #3a2a2f 0%, #141414 60%)",
        color: "#e8e2d6",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}>
        <div style={{ fontSize: 34, color: "#f4a7b9", fontWeight: 700, letterSpacing: 1 }}>
          OINK
        </div>
        <div
          style={{
            fontSize: 74,
            fontWeight: 800,
            lineHeight: 1.04,
            letterSpacing: -2,
            marginTop: 18,
          }}
        >
          {SITE.tagline}
        </div>
        <div style={{ fontSize: 30, color: "#a8a196", marginTop: 26, lineHeight: 1.35 }}>
          Free expense and budget tracker for the Philippines.
        </div>
      </div>
      <PigFace />
    </div>,
    size,
  );
}
