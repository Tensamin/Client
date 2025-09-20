"use client";

// Package Imports
import { createContext, useContext, useEffect, useState } from "react";
import { motion } from "framer-motion";

// Lib Imports
import { Padding } from "@/lib/utils";

// Context Imports
import { CryptoProvider } from "@/context/crypto";
import { SocketProvider } from "@/context/socket";
import { UserProvider } from "@/context/user";
import { MessageProvider } from "@/context/message";

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
import { Communities, Conversations } from "@/components/modals/category";

// Pages
import LoginPage from "@/page/login";
import HomePage from "@/page/home";
import SettingsPage from "@/page/settings";
import ChatPage from "@/page/chat";

// Main
type PageContextType = {
  page: string;
  pageData: string;
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
  const [category, setCategory] = useState<"Conversations" | "Communities">(
    "Conversations"
  );

  function setPage(page: string, data: string = "") {
    setPageRaw(page);
    setPageData(data);
  }

  useEffect(() => {
    setUuid(localStorage.getItem("auth_uuid") || "");
  }, []);

  const contextValue = {
    page,
    pageData,
    setPage,
  };

  if (page === "error") return <Loading message={pageData || "ERROR"} />;
  if (page === "login")
    return (
      <PageContext.Provider value={contextValue}>
        <CryptoProvider>
          <LoginPage />
        </CryptoProvider>
      </PageContext.Provider>
    );

  function PageSwitch() {
    const { open, isMobile } = useSidebar();

    let jsxPage;
    switch (page) {
      case "home":
        jsxPage = <HomePage />;
        break;
      case "settings":
        jsxPage = <SettingsPage />;
        break;
      case "chat":
        jsxPage = <ChatPage />;
        break;
      default:
        jsxPage = <div>Unkown Page | {pageData}</div>;
        break;
    }

    return (
      <div
        className={`${open && !isMobile ? "rounded-tl-xl border-l" : ""} w-full h-full border-t border-input bg-background p-2`}
      >
        {jsxPage}
      </div>
    );
  }

  return (
    <PageContext.Provider value={contextValue}>
      <CryptoProvider>
        <SocketProvider>
          <UserProvider>
            <MessageProvider>
              <SidebarProvider>
                <Sidebar className="group-data-[side=left]:border-0">
                  <SidebarHeader
                    className={`p-${Padding} flex flex-col gap-${Padding * 3}`}
                  >
                    <UserModal key={uuid} uuid={uuid} size="big" />
                    <div className="relative inline-flex rounded-full bg-input/30 border border-input overflow-hidden p-1">
                      <div className="relative grid grid-cols-2 w-full">
                        {["Communities", "Conversations"].map((cat: string) => (
                          <Button
                            key={cat}
                            variant="ghost"
                            type="button"
                            className="relative isolate rounded-full py-1.5 transition-colors dark:hover:bg-transparent hover:bg-transparent"
                            onClick={() =>
                              setCategory(
                                cat as "Communities" | "Conversations"
                              )
                            }
                            aria-pressed={category === cat}
                            aria-label={cat}
                          >
                            {category === cat && (
                              <motion.span
                                aria-hidden="true"
                                layoutId="category-pill"
                                className="absolute inset-0 rounded-full bg-input/50 pointer-events-none border"
                                transition={{
                                  type: "spring",
                                  stiffness: 350,
                                  damping: 28,
                                }}
                              />
                            )}
                            <span className="relative z-10 hover:underline underline-offset-2 text-sm">
                              {cat}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      {["Communities", "Conversations"].map((cat) => {
                        if (cat !== category) return null;
                        return category === "Communities" ? (
                          <Communities key={category} />
                        ) : (
                          <Conversations key={category} />
                        );
                      })}
                    </div>
                  </SidebarHeader>
                  <SidebarContent></SidebarContent>
                </Sidebar>
                <div className="w-full h-screen flex flex-col bg-sidebar overflow-hidden">
                  <Navbar />
                  <PageSwitch />
                </div>
                <div
                  className="p-1 p-2 px-1 px-2 pr-1 pr-2 my-1 my-2 gap-1 gap-2 size-8 size-9"
                  hidden
                />
              </SidebarProvider>
            </MessageProvider>
          </UserProvider>
        </SocketProvider>
      </CryptoProvider>
    </PageContext.Provider>
  );
}
