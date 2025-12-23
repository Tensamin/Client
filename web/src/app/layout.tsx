// Package Imports
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import packageJson from "../../package.json";

// CSS Imports
import "@livekit/components-styles";
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";
import "./globals.css";

// Context Imports
import { PageProvider } from "@/context/page";
import { StorageProvider } from "@/context/storage";

// Components
import { Loading } from "@/components/loading";

// Main
const font = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: packageJson.productName,
  },
  title: packageJson.productName,
  description: packageJson.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        data-lk-theme="default"
        className={`antialiased max-h-screen overflow-hidden ${font.className}`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="theme"
        >
          <StorageProvider>
            <PageProvider>
              <Suspense fallback={<Loading progress={10} />}>
                {children}
              </Suspense>
            </PageProvider>
          </StorageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
