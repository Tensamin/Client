// Package Imports
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import packageJson from "../../../../package.json";

// Lib Imports
import { sans } from "@/lib/fonts";

// CSS Imports
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";
import "../../globals.css";
import "../../colors.css";

// Context Imports
import { StorageProvider } from "@/context/storage";
import { PageProvider } from "@/context/page";

// Components
import { Toaster } from "@/components/ui/sonner";
import * as Icon from "lucide-react";

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
    title: `${packageJson.productName} - Anonymous Call`,
  },
  title: `${packageJson.productName} - Anonymous Call`,
  description: "Join a call anonymously",
};

export default function AnonymousCallLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className="pt-[env(safe-area-inset-top)]"
      lang="en"
      suppressHydrationWarning
    >
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
            <PageProvider>{children}</PageProvider>
          </StorageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
