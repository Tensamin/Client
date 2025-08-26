"use client";

// Package Imports
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

// Lib Imports
import ls from "@/lib/localStorageManager";

// Context Imports
import { WebSocketProvider } from "@/components/context/websocket";
import { MessageProvider } from "@/components/context/message";
import { UsersProvider } from "@/components/context/users"
import { PageProvider } from "@/components/context/page";
import { CryptoProvider } from "@/components/context/crypto";
import { EncryptionProvider } from "@/components/context/encryption";
import { ThemeProvider } from "@/components/context/theme";
import { CallProvider } from "@/components/context/call";
import { ModsProvider } from "@/components/context/mods"
import { CommunityProvider } from "@/components/context/communtiy"

// Components
import { Loading } from "@/components/loading/content";
import { Page } from "@/components/page"

// Main
export function LoadingWrapper() {
    let [isAuthenticated, setIsAuthenticated] = useState(false);
    let [isLoading, setIsLoading] = useState(true);

    let router = useRouter();
    let pathname = usePathname();

    useEffect(() => {
        let private_key = ls.get("auth_private_key");
        let uuid = ls.get("auth_uuid");

        const authenticated = (private_key && uuid);
        setIsAuthenticated(authenticated);

        if (pathname === '/login') {
            setIsLoading(false);
            return;
        }

        if (!authenticated) {
            router.push('/login');
            setIsLoading(true);
            return;
        }
    }, [router, pathname]);

    useEffect(() => {
        if (pathname === '/login') {
            setIsLoading(false);
            return;
        }

        if (isAuthenticated) {
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }
    }, [isAuthenticated, pathname]);

    useEffect(() => {
        setInterval(() => {
            let warningMessage = `
  %cDO NOT PASTE ANYTHING IN HERE!
`, styles = [
                    'color: red; font-size: 20px; font-weight: bold;',
                ];

            if (ls.get("debug") !== "true" && ls.get("debug") !== "no-warning") {
                console.log(warningMessage, ...styles);
                console.log("Enabled debug mode to hide this warning.")
            }
        }, 3000)
    }, [])

    return isLoading ? (
        <Loading />
    ) : pathname === '/login' ? (
        <Page />
    ) : isAuthenticated ? (
        <EncryptionProvider>
            <UsersProvider>
                <CryptoProvider>
                    <WebSocketProvider>
                        <MessageProvider>
                            <CallProvider>
                                <PageProvider>
                                    <CommunityProvider>
                                        <ThemeProvider>
                                            <ModsProvider>
                                                <Page />
                                            </ModsProvider>
                                        </ThemeProvider>
                                    </CommunityProvider>
                                </PageProvider>
                            </CallProvider>
                        </MessageProvider>
                    </WebSocketProvider>
                </CryptoProvider>
            </UsersProvider>
        </EncryptionProvider>
    ) : null;
}