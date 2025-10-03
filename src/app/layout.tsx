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
  description: "Super secure messaging app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
