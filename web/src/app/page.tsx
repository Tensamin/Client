"use client";

// Package Imports
import { motion } from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  ViewTransition,
} from "react";

// Context Imports
import { useCallContext } from "@/context/call";
import { useCryptoContext } from "@/context/crypto";
import { usePageContext } from "@/context/page";

// Components
import { PageTransition } from "@/components/animation/page-transition";
import { Communities, Conversations } from "@/components/modals/category";
import { UserModal } from "@/components/modals/user";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { VoiceActions } from "@/special/call/components/voice-actions";

// Pages
import ChatPage from "@/page/chat";
import HomePage from "@/page/home";
import SettingsPage from "@/page/settings";
import CallPage from "@/special/call/layout/page";

export default function Page() {
  const [, startTransition] = useTransition();

  const { ownId } = useCryptoContext();
  const { page, pageInstance } = usePageContext();
  const [category, setCategory] = useState<"CONVERSATIONS" | "COMMUNITIES">(
    "CONVERSATIONS"
  );

  // Scroll position tracking
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const voiceRef = useRef<HTMLDivElement | null>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const { shouldConnect } = useCallContext();

  // Scroll position tracking
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setIsAtTop(el.scrollTop === 0);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [category]);

  // Overflow detection
  useEffect(() => {
    const el = scrollRef.current;
    const voiceEl = voiceRef.current;
    if (!el) return;
    const getAvailableHeight = () => {
      const voiceHeight = shouldConnect && voiceEl ? voiceEl.offsetHeight : 0;
      return el.clientHeight - voiceHeight;
    };
    const updateOverflow = () => {
      const available = getAvailableHeight();
      setIsOverflowing(el.scrollHeight > available + 1);
    };
    const runInitial = () =>
      requestAnimationFrame(() => requestAnimationFrame(updateOverflow));
    runInitial();
    const ro = new ResizeObserver(() => updateOverflow());
    ro.observe(el);
    if (voiceEl) ro.observe(voiceEl);
    const mo = new MutationObserver(() =>
      requestAnimationFrame(() => requestAnimationFrame(updateOverflow))
    );
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    const onWindowResize = () => updateOverflow();
    window.addEventListener("resize", onWindowResize, { passive: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", onWindowResize);
    };
  }, [category, shouldConnect]);

  return (
    <PageTransition>
      <div className="w-full h-screen flex bg-sidebar">
        <div className="w-64 h-full flex flex-col p-2 shrink-0">
          <UserModal key={ownId} id={ownId} size="big" />
          <div className="relative inline-flex rounded-full bg-input/30 border border-input overflow-hidden mt-3 mx-1 p-1 min-h-11.5">
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
                        setCategory(cat as "COMMUNITIES" | "CONVERSATIONS")
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

          <div className="relative flex-1 overflow-y-auto">
            <div
              ref={scrollRef}
              className="scrollbar-hide h-full overflow-y-auto pt-3"
            >
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

            {/* Top fade */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 top-0 h-10 z-20 transition-opacity duration-200 bg-gradient-to-b from-sidebar to-transparent ${
                isAtTop ? "opacity-0" : "opacity-100"
              }`}
            />

            {/* Bottom fade */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-10 z-20 transition-opacity duration-200 bg-gradient-to-t from-sidebar to-transparent ${
                shouldConnect && isOverflowing ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>

          <div ref={voiceRef}>
            <VoiceActions />
          </div>
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
