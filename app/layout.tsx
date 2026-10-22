import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "./i18n";

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
      <body className="antialiased"><I18nProvider>{children}</I18nProvider></body>
    </html>
  );
}
