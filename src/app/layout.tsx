// Package Imports
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import "./globals.css";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

// Context Imports
import { StorageProvider } from "@/context/storage";

// Components
import { Loading } from "@/components/loading";
import { Toaster } from "@/components/ui/sonner";
import { PageProvider } from "@/context/page";

// Main
export const metadata: Metadata = {
  title: "Tensamin",
  description:
    "True E2E decentralized messages and a highly customizable messaging app",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="./manifest.json" />
        <meta name="apple-mobile-web-app-title" content="Tensamin" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body className="antialiased max-h-screen overflow-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="theme"
        >
          <StorageProvider>
            <PageProvider>
              <Suspense fallback={<Loading />}>
                <Toaster position="top-right" richColors expand />
                {children}
              </Suspense>
            </PageProvider>
          </StorageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
