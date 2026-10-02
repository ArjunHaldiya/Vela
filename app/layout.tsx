import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Aide — care companion",
  description: "Aide drafts, checks in, and escalates. People decide.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#256558" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
