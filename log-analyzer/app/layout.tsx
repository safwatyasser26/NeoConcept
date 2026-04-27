import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Log Analyzer",
  description:
    "Standalone log analyzer for NeoConcept's backend services, built with Next.js and React. It provides a user-friendly interface to view and analyze log files, helping developers and system administrators to monitor and troubleshoot their applications effectively.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
