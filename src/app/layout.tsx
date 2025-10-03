// Package Imports
import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="Tensamin" />
      </head>
      <body className="antialiased max-h-screen overflow-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="theme"
        >
          <PageProvider>
            <StorageProvider>
              <Suspense fallback={<Loading />}>
                <Toaster position="top-right" richColors expand />
                {children}
              </Suspense>
            </StorageProvider>
          </PageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
