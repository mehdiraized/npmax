import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "npMax",
  description:
    "npMax 3 — faster dependency updates, MCP for AI, and a PWA App. Stable on macOS, Windows, and Linux.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#06090f" }}>{children}</body>
      <Analytics />
    </html>
  );
}
