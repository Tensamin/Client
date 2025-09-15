// Package Imports
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import "./globals.css";

// Components
import { Loading } from "@/components/loading";
import { Toaster } from "@/components/ui/sonner";

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
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="theme"
        >
          <Suspense fallback={<Loading />}>
            <Toaster position="top-right" richColors expand />
            {children}
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
