// Package Imports
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "../globals.css";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";
import "@livekit/components-styles";

// Main
const font = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tensamin",
  description:
    "True E2EE, decentralized messages. Open source and privacy first.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`antialiased h-screen w-screen overflow-hidden flex justify-center items-center ${font.className}`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
