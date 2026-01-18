// Package Imports
import * as Icon from "lucide-react";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import packageJson from "../../../package.json";

// Lib Imports
import { sans } from "@/lib/fonts";

// CSS Imports
//import "@livekit/components-styles";
import "../globals.css";
// (anti-format)
import "../colors.css";

// Components
import { Toaster } from "@/components/ui/sonner";

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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`antialiased pt-[env(safe-area-inset-top)] max-h-screen overflow-hidden ${sans.className}`}
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
