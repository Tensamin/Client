"use client";

// Package Imports
import { createContext, useContext, useState } from "react";

// Context Imports
import { SidebarProvider } from "@/components/ui/sidebar";
import { CryptoProvider } from "@/context/crypto";
import { SocketProvider } from "@/context/socket";
import { UserProvider } from "@/context/user";

// Components
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Loading } from "@/components/loading";
import { UserModal } from "@/components/modals/user";
import LoginPage from "@/page/login";
import HomePage from "@/page/home";
import SettingsPage from "@/page/settings";

type PageContextType = {
  page: string;
  pageData?: string;
  setPage: (page: string, data?: string) => void;
};

const PageContext = createContext<PageContextType | null>(null);

export function usePageContext() {
  const context = useContext(PageContext);
  if (!context)
    throw new Error("useContext function used outside of its provider");
  return context;
}

export default function PageProvider() {
  const [page, setPageRaw] = useState("home");
  const [pageData, setPageData] = useState("");
  const [category, setCategory] = useState<"chats" | "communities">("chats");

  function setPage(page: string, data: string = "") {
    setPageRaw(page);
    setPageData(data);
  }

  if (page === "error") return <Loading message={pageData || "ERROR"} />;
  if (page === "login")
    return (
      <CryptoProvider>
        <LoginPage />
      </CryptoProvider>
    );

  function Common({ children }: { children: React.ReactNode }) {
    const { open } = useSidebar();

    return (
      <>
        <Sidebar className="group-data-[side=left]:border-0">
          <SidebarHeader className="p-1 flex flex-col gap-1">
            <UserModal uuid={localStorage.getItem("auth_uuid") || ""} />
            <div className="rounded-full bg-input/30 border border-input flex flex-nowrap items-center">
              <Button variant="link" className="w-1/2 text-xs">
                Conversations
              </Button>
              <div className="h-2/3 border-l"/>
              <Button variant="link" className="w-1/2 text-xs">
                Communities
              </Button>
            </div>
          </SidebarHeader>
          <SidebarContent></SidebarContent>
        </Sidebar>
        <div className="w-full h-screen flex flex-col bg-sidebar overflow-hidden">
          <Navbar />
          <div
            className={`${open && "rounded-tl-xl border-l"} w-full h-full border-t bg-background p-2`}
          >
            {children}
          </div>
        </div>
      </>
    );
  }

  function PageSwitch() {
    switch (page) {
      case "home":
        return <HomePage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <div>Unkown Page</div>;
    }
  }

  return (
    <PageContext.Provider value={{ page, pageData, setPage }}>
      <CryptoProvider>
        <UserProvider>
          <SocketProvider>
            <SidebarProvider>
              <Common>
                <PageSwitch />
              </Common>
            </SidebarProvider>
          </SocketProvider>
        </UserProvider>
      </CryptoProvider>
    </PageContext.Provider>
  );
}
