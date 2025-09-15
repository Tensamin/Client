"use client";

// Package Imports
import { createContext, useContext, useEffect, useState } from "react";

// Lib Imports
import { Padding } from "@/lib/utils";

// Context Imports
import { CryptoProvider } from "@/context/crypto";
import { SocketProvider } from "@/context/socket";
import { UserProvider } from "@/context/user";

// Components
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuItem,
  SidebarProvider,
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
  const [uuid, setUuid] = useState("");
  const [page, setPageRaw] = useState("home");
  const [pageData, setPageData] = useState("");
  const [category, setCategory] = useState<"chats" | "communities">("chats");

  function setPage(page: string, data: string = "") {
    setPageRaw(page);
    setPageData(data);
  }

  useEffect(() => {
    setUuid(localStorage.getItem("auth_uuid") || "");
  }, []);

  if (page === "error") return <Loading message={pageData || "ERROR"} />;
  if (page === "login")
    return (
      <CryptoProvider>
        <LoginPage />
      </CryptoProvider>
    );

  function PageSwitch() {
    const { open } = useSidebar();

    let jsxPage;
    switch (page) {
      case "home":
        jsxPage = <HomePage />;
        break;
      case "settings":
        jsxPage = <SettingsPage />;
        break;
      default:
        jsxPage = <div>Unkown Page</div>;
        break;
    }

    return (
      <>
        <Sidebar className="group-data-[side=left]:border-0">
          <SidebarHeader
            className={`p-${Padding} flex flex-col gap-${Padding}`}
          >
            <UserModal key={uuid} uuid={uuid} />
            <div className="rounded-full bg-input/30 border border-input flex flex-nowrap items-center">
              <Button variant="link" className="w-1/2 text-xs">
                Conversations
              </Button>
              <div className="h-2/3 border-l" />
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
            {jsxPage}
          </div>
        </div>
        <div
          className="p-1 p-2 px-1 px-2 pr-1 pr-2 my-1 my-2 gap-1 gap-2"
          hidden
        />
      </>
    );
  }

  return (
    <PageContext.Provider value={{ page, pageData, setPage }}>
      <CryptoProvider>
        <UserProvider>
          <SocketProvider>
            <SidebarProvider>
              <PageSwitch />
            </SidebarProvider>
          </SocketProvider>
        </UserProvider>
      </CryptoProvider>
    </PageContext.Provider>
  );
}
