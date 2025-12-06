"use client";

// Package Imports
import { useState, useTransition, ViewTransition } from "react";
import { motion } from "framer-motion";

// Context Imports
import { useCryptoContext } from "@/context/crypto";
import { usePageContext } from "@/context/page";

// Components
import { PageTransition } from "@/components/animation/page-transition";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { UserModal } from "@/components/modals/user";
import { VoiceActions } from "@/components/modals/call";
import { Communities, Conversations } from "@/components/modals/category";

// Pages
import HomePage from "@/page/home";
import SettingsPage from "@/page/settings";
import ChatPage from "@/page/chat";
import CallPage from "@/page/call";

export default function Page() {
  const [, startTransition] = useTransition();

  const { ownId } = useCryptoContext();
  const { page, pageInstance } = usePageContext();
  const [category, setCategory] = useState<"CONVERSATIONS" | "COMMUNITIES">(
    "CONVERSATIONS",
  );

  return (
    <PageTransition>
      <div className="w-full h-screen flex bg-sidebar">
        <div className="w-64 h-full flex flex-col gap-4 p-2 shrink-0">
          <UserModal key={ownId} id={ownId} size="big" />
          <div className="relative inline-flex rounded-full bg-input/30 border border-input overflow-hidden mx-1 p-1">
            <div className="relative grid grid-cols-2 w-full gap-1">
              <ViewTransition>
                {["COMMUNITIES", "CONVERSATIONS"].map((cat: string) => (
                  <Button
                    key={cat}
                    variant="ghost"
                    type="button"
                    className={`select-none relative isolate rounded-full py-1.5 transition-colors dark:hover:bg-input/20 hover:bg-input/20 ${
                      category !== cat
                        ? "hover:border hover:border-input/30"
                        : ""
                    }`}
                    onClick={() =>
                      startTransition(() =>
                        setCategory(cat as "COMMUNITIES" | "CONVERSATIONS"),
                      )
                    }
                    aria-pressed={category === cat}
                    aria-label={cat}
                    style={{
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {category === cat && (
                      <motion.span
                        layoutId="bubble"
                        className="absolute inset-0 z-10 bg-input/75 rounded-full border border-ring/13 mix-blend-difference"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.4,
                        }}
                      />
                    )}
                    <span className="relative z-10 text-sm flex">
                      {cat === "COMMUNITIES" ? "Communities" : "Conversations"}
                    </span>
                  </Button>
                ))}
              </ViewTransition>
            </div>
          </div>
          <div className="scrollbar-hide flex-1">
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
          <VoiceActions />
        </div>
        <div className="flex-1 h-full flex flex-col">
          <Navbar />
          <div className="flex-1 bg-background rounded-tl-xl border overflow-auto p-2">
            <ViewTransition name="page-vt">
              {page === "home" && <HomePage key={`home-${pageInstance}`} />}
              {page === "settings" && (
                <SettingsPage key={`settings-${pageInstance}`} />
              )}
              {page === "chat" && <ChatPage key={`chat-${pageInstance}`} />}
              {page === "call" && <CallPage key={`call-${pageInstance}`} />}
            </ViewTransition>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
