"use client";

// Package Imports
import { useState } from "react";
import { motion } from "framer-motion";

// Context Imports
import { CryptoProvider, useCryptoContext } from "@/context/crypto";
import { SocketProvider } from "@/context/socket";
import { UserProvider } from "@/context/user";
import { MessageProvider } from "@/context/message";
import { usePageContext } from "@/context/page";
import { useStorageContext } from "@/context/storage";

// Components
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
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

function MainPage() {
  const { ownUuid } = useCryptoContext();
  const { page, pageData } = usePageContext();
  const { translate } = useStorageContext();
  const [category, setCategory] = useState<"CONVERSATIONS" | "COMMUNITIES">(
    "CONVERSATIONS"
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
        jsxPage = (
          <div>
            {translate("PAGE_UNKNOWN")} | {page};{pageData}
          </div>
        );
        break;
    }

    return (
      <div
        className={`${
          open && !isMobile ? `pl-1` : ""
        } flex-1 min-h-0 overflow-hidden`}
      >
        <div
          className={`${
            open && !isMobile ? "rounded-tl-xl border-l" : ""
          } w-full h-full border-t border-input bg-background p-2 overflow-y-auto`}
        >
          {jsxPage}
        </div>
      </div>
    );
  }

  return (
    <>
      <Sidebar className="group-data-[side=left]:border-0">
        <SidebarHeader className="p-0 pl-2 pt-2 pr-1 flex flex-col">
          <UserModal key={ownUuid} uuid={ownUuid} size="big" />
          <div className="relative inline-flex rounded-full bg-input/30 border border-input overflow-hidden mx-1 my-2 p-1">
            <div className="relative grid grid-cols-2 w-full gap-1">
              {["COMMUNITIES", "CONVERSATIONS"].map((cat: string) => (
                <Button
                  key={cat}
                  variant="ghost"
                  type="button"
                  className={`relative isolate rounded-full py-1.5 transition-colors dark:hover:bg-input/20 hover:bg-input/20 ${
                    category !== cat ? "hover:border hover:border-input/30" : ""
                  }`}
                  onClick={() =>
                    setCategory(cat as "COMMUNITIES" | "CONVERSATIONS")
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
                  <span className="relative z-10 text-sm">
                    {translate(cat)}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-0 pl-2 pt-2 pr-1 scrollbar-hide">
          {["COMMUNITIES", "CONVERSATIONS"].map((cat) => {
            if (cat !== category) return null;
            return category === "COMMUNITIES" ? (
              <Communities key={category} />
            ) : (
              <Conversations key={category} />
            );
          })}
        </SidebarContent>
      </Sidebar>
      <div className="w-full h-screen flex flex-col bg-sidebar min-h-0">
        <Navbar />
        <PageSwitch />
      </div>
    </>
  );
}

export default function Page() {
  const { page, pageData, extraPageData } = usePageContext();

  if (page === "error")
    return (
      <Loading message={pageData || "ERROR"} extra={extraPageData || ""} />
    );
  if (page === "login")
    return (
      <CryptoProvider>
        <LoginPage />
      </CryptoProvider>
    );

  return (
    <CryptoProvider>
      <SocketProvider>
        <UserProvider>
          <MessageProvider>
            <SidebarProvider>
              <MainPage />
            </SidebarProvider>
          </MessageProvider>
        </UserProvider>
      </SocketProvider>
    </CryptoProvider>
  );
}
