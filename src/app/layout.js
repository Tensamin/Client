// Package Imports
import { JetBrains_Mono } from "next/font/google";

// Lib Imports
import { isElectron } from "@/lib/utils";

// Components
import "./globals.css";
import { endpoint } from "@/lib/endpoints";

// Main
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export let metadata = {
  title: "Tensamin",
  description: "Super secure messaging app",
};

// suppressHydrationWarning
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" as="audio" href={endpoint.sound_call} />
      </head>
      <body className={`${jetbrainsMono.variable} antialiased ${isElectron() && "rounded-xl"}`}>
        <audio
          src={endpoint.sound_call}
          preload="auto"
          muted
          playsInline
          style={{ display: "none" }}
        />
        {children}
      </body>
    </html>
  );
}
