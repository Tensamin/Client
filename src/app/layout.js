// Package Imports
import { JetBrains_Mono } from "next/font/google";

// Components
import "./globals.css";

// Main
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
})

export let metadata = {
  title: "Tensamin",
  description: "Super secure messaging app",
};

// suppressHydrationWarning
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}