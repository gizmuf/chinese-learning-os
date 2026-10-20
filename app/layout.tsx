import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chinese OS · A little Chinese, every day",
  description:
    "Practice Chinese handwriting, listening and vocabulary with personal spaced repetition.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
