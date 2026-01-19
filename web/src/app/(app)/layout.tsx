// Package Imports
import * as Icon from "lucide-react";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import packageJson from "../../../package.json";

// Lib Imports
import { sans } from "@/lib/fonts";

// CSS Imports
//import "@livekit/components-styles";
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";
import "../globals.css";
// (anti-format)
import "../colors.css";

// Context Imports
import { StorageProvider } from "@/context/storage";

// Components
import { Loading } from "@/components/loading";
import { Toaster } from "@/components/ui/sonner";
import { CryptoProvider } from "@/context/crypto";
import { PageProvider } from "@/context/page";
import { progressBar } from "@/lib/utils";

// Main
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: false,
  maximumScale: 1,
  minimumScale: 1,
  viewportFit: "contain",
};

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
    <html className="pt-[env(safe-area-inset-top)]" lang="en" suppressHydrationWarning>
      <body
        data-lk-theme="default"
        className={`antialiased max-h-screen overflow-hidden ${sans.className}`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="theme"
        >
          <Toaster
            position="top-right"
            expand
            icons={{
              success: <Icon.Check size={19} />,
              error: <Icon.X size={19} />,
              warning: <Icon.AlertTriangle size={19} />,
              info: <Icon.Book size={19} />,
              loading: <Icon.Loader size={19} className="animate-spin" />,
            }}
          />
          <StorageProvider>
            <PageProvider>
              <CryptoProvider>
                <Suspense fallback={<Loading progress={progressBar.layout} />}>
                  {children}
                </Suspense>
              </CryptoProvider>
            </PageProvider>
          </StorageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
