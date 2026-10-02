import "./globals.css";
import type { Metadata, Viewport } from "next";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Vela — care companion",
  description: "Vela drafts, checks in, and escalates. People decide.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#256558" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Header />
        {children}
      </body>
    </html>
  );
}
