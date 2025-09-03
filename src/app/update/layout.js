// Package Imports
import { JetBrains_Mono } from "next/font/google";

// Components
import "../globals.css";

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
export default function RootLayout() {
    return (
        <html lang="en">
            <body className={`${jetbrainsMono.variable} antialiased bg-transparent`}>
                <div className="w-screen h-screen bg-[#11111b] flex justify-center items-center">
                    <div className="justift-start flex items-center gap-6">
                        <img
                            src="/loading.gif"
                            alt="Tensamin"
                            width={180}
                            height={180}
                            className="w-25 h-25 rounded-4xl select-none"
                            loading="eager"
                        />
                        <div className="flex flex-col text-left justify-start">
                            <p className="font-bold font-mono text-4xl text-[#c6d0f5]">
                                Tensamin
                            </p>
                            <p className="font-mono text-2xl text-[#c6d0f5]">
                                There is a update available, please download the latest release from github
                            </p>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
