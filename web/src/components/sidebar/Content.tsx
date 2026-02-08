import { useEffect, useRef, useState, ViewTransition } from "react";

import { useCallContext } from "@/context/call/CallContext";

import VoiceActions from "@/components/call/components/SidebarActions";
import { Communities, Conversations } from "@/components/modals/CategoryModal";

export default function Content({
  category,
}: {
  category: "CONVERSATIONS" | "COMMUNITIES";
}) {
  // Scroll position tracking
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const voiceRef = useRef<HTMLDivElement | null>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const { shouldConnect } = useCallContext();

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
      requestAnimationFrame(() => requestAnimationFrame(updateOverflow)),
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
    <>
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
    </>
  );
}
