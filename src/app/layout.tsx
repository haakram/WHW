import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "World History Web",
  description: "An interactive globe of world history, 3000 BC to today.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
