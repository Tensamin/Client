"use client";

// Package Imports
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Context Imports
import { CryptoProvider, useCryptoContext } from "@/context/crypto";
import { SocketProvider } from "@/context/socket";
import { UserProvider } from "@/context/user";
import { MessageProvider } from "@/context/message";
import { usePageContext } from "@/context/page";
import { useStorageContext } from "@/context/storage";

// Components
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
  const [jsxPage, setJsxPage] = useState<React.JSX.Element | null>(null);
  const [category, setCategory] = useState<"CONVERSATIONS" | "COMMUNITIES">(
    "CONVERSATIONS"
  );

  useEffect(() => {
    switch (page) {
      case "home":
        setJsxPage(<HomePage />);
        break;
      case "settings":
        setJsxPage(<SettingsPage />);
        break;
      case "chat":
        setJsxPage(<ChatPage />);
        break;
      default:
        setJsxPage(
          <div>
            {translate("PAGE_UNKNOWN")} | {page};{pageData}
          </div>
        );
        break;
    }
  }, [page, pageData]);

  return (
    <div className="w-full h-screen flex bg-sidebar">
      <div className="w-64 h-full flex flex-col gap-4 p-2 shrink-0">
        <UserModal key={ownUuid} uuid={ownUuid} size="big" />
        <div className="relative inline-flex rounded-full bg-input/30 border border-input overflow-hidden mx-1 p-1">
          <div className="relative grid grid-cols-2 w-full gap-1">
            {["COMMUNITIES", "CONVERSATIONS"].map((cat: string) => (
              <Button
                key={cat}
                variant="ghost"
                type="button"
                className={`select-none relative isolate rounded-full py-1.5 transition-colors dark:hover:bg-input/20 hover:bg-input/20 ${
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
                <span className="relative z-10 text-sm flex">
                  {translate(cat)}
                </span>
              </Button>
            ))}
          </div>
        </div>
        <div className="scrollbar-hide">
          {["COMMUNITIES", "CONVERSATIONS"].map((cat) => {
            if (cat !== category) return null;
            return category === "COMMUNITIES" ? (
              <Communities key={category} />
            ) : (
              <Conversations key={category} />
            );
          })}
        </div>
      </div>
      <div className="flex-1 h-full flex flex-col">
        <Navbar />
        <div
          className={`flex-1 bg-background rounded-tl-xl border overflow-auto ${
            page !== "chat" && "p-2"
          }`}
        >
          {jsxPage}
        </div>
      </div>
    </div>
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
            <MainPage />
          </MessageProvider>
        </UserProvider>
      </SocketProvider>
    </CryptoProvider>
  );
}
