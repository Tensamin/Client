"use client";

// Package Imports
import { useState, useTransition, ViewTransition } from "react";

// Context Imports
import { useCryptoContext } from "@/context/crypto";
import { usePageContext } from "@/context/page";
import { useStorageContext } from "@/context/storage";

// Components
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { UserModal } from "@/components/modals/user";
import { Communities, Conversations } from "@/components/modals/category";

// Pages
import HomePage from "@/page/home";
import SettingsPage from "@/page/settings";
import ChatPage from "@/page/chat";

export default function Page() {
  const { ownUuid } = useCryptoContext();
  const { page } = usePageContext();
  const { translate } = useStorageContext();
  const [category, setCategory] = useState<"CONVERSATIONS" | "COMMUNITIES">(
    "CONVERSATIONS"
  );
  const [, startTransition] = useTransition();

  return (
    <div className="w-full h-screen flex bg-sidebar">
      <div className="w-64 h-full flex flex-col gap-4 p-2 shrink-0">
        <UserModal key={ownUuid} uuid={ownUuid} size="big" />
        <div className="relative inline-flex rounded-full bg-input/30 border border-input overflow-hidden mx-1 p-1">
          <div className="relative grid grid-cols-2 w-full gap-1">
            <ViewTransition>
              {["COMMUNITIES", "CONVERSATIONS"].map((cat: string) => (
                <Button
                  key={cat}
                  variant="ghost"
                  type="button"
                  className={`select-none relative isolate rounded-full py-1.5 transition-colors dark:hover:bg-input/20 hover:bg-input/20 ${
                    category !== cat ? "hover:border hover:border-input/30" : ""
                  }`}
                  onClick={() =>
                    startTransition(() =>
                      setCategory(cat as "COMMUNITIES" | "CONVERSATIONS")
                    )
                  }
                  aria-pressed={category === cat}
                  aria-label={cat}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-input/50 pointer-events-none border transition-opacity"
                    style={{
                      viewTransitionName:
                        category === cat ? "category-pill" : undefined,
                      opacity: category === cat ? 1 : 0,
                    }}
                  />
                  <span className="relative z-10 text-sm flex">
                    {translate(cat)}
                  </span>
                </Button>
              ))}
            </ViewTransition>
          </div>
        </div>
        <div className="scrollbar-hide">
          <ViewTransition>
            {["COMMUNITIES", "CONVERSATIONS"].map((cat) => {
              if (cat !== category) return null;
              return category === "COMMUNITIES" ? (
                <Communities key={category} />
              ) : (
                <Conversations key={category} />
              );
            })}
          </ViewTransition>
        </div>
      </div>
      <div className="flex-1 h-full flex flex-col">
        <Navbar />
        <div className="flex-1 bg-background rounded-tl-xl border overflow-auto p-2">
          <ViewTransition>
            {page === "home" && <HomePage />}
            {page === "settings" && <SettingsPage />}
            {page === "chat" && <ChatPage />}
          </ViewTransition>
        </div>
      </div>
    </div>
  );
}
