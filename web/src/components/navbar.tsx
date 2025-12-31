"use client";

// Package Imports
import { AnimatePresence } from "framer-motion";
import * as Icon from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Context Imports
import { usePageContext } from "@/context/page";
import { useUserContext } from "@/context/user";

// Components
import { MotionDivWrapper } from "@/components/animation/presence";
import { CallButtonWrapper } from "@/components/call/components/call-button";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { WindowControls } from "@/components/windowControls";

// Main
export default function Navbar() {
  const { setPage, page } = usePageContext();
  const { failedMessagesAmount, currentReceiverId, get } = useUserContext();
  const [receiverUsername, setReceiverUsername] = useState("");

  useEffect(() => {
    if (!currentReceiverId) {
      setReceiverUsername("");
      return;
    }

    let isCancelled = false;
    get(currentReceiverId, false).then((user) => {
      if (!isCancelled) {
        setReceiverUsername(user.display);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [currentReceiverId, get]);

  // Calculate Electron drag area width
  const electronDragAreaCalc = useRef<HTMLDivElement>(null);
  const electronDragArea = useRef<HTMLDivElement>(null);
  const navbarContainer = useRef<HTMLDivElement>(null);
  const leftButtonsContainer = useRef<HTMLDivElement>(null);

  const getWidth = useCallback(() => {
    if (
      !electronDragArea.current ||
      !electronDragAreaCalc.current ||
      !navbarContainer.current ||
      !leftButtonsContainer.current
    ) {
      return;
    }
    const containerWidth = navbarContainer.current.clientWidth;
    const rightButtonsWidth = electronDragAreaCalc.current.clientWidth;
    const leftButtonsWidth = leftButtonsContainer.current.clientWidth;
    const availableWidth =
      containerWidth - rightButtonsWidth - leftButtonsWidth - 12;
    electronDragArea.current.style.width = `${Math.max(0, availableWidth)}px`;
  }, []);

  // Update drag area width on layout change
  useLayoutEffect(() => {
    getWidth();

    const resizeObserver = new ResizeObserver(getWidth);
    if (navbarContainer.current) {
      resizeObserver.observe(navbarContainer.current);
    }
    if (electronDragAreaCalc.current) {
      resizeObserver.observe(electronDragAreaCalc.current);
    }
    if (leftButtonsContainer.current) {
      resizeObserver.observe(leftButtonsContainer.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [getWidth]);

  const handleHomeClick = useCallback(() => setPage("home"), [setPage]);
  const handleSettingsClick = useCallback(() => setPage("settings"), [setPage]);

  const isChat = page === "chat";
  const showFailedMessages = failedMessagesAmount > 0 && isChat;

  const failedMessagesText = useMemo(
    () =>
      failedMessagesAmount === 1
        ? "Failed to load 1 message"
        : `${failedMessagesAmount} messages failed to load`,
    [failedMessagesAmount],
  );

  return (
    <div
      ref={navbarContainer}
      className="relative w-full my-2 h-9 flex gap-2 items-center bg-sidebar shrink-0 pr-2"
    >
      <div ref={leftButtonsContainer} className="flex gap-2 items-center">
        {/* Homepage Button */}
        <Button className="h-9 w-9" variant="outline" onClick={handleHomeClick}>
          <Icon.Home />
        </Button>

        {/* Settings Button */}
        <Button
          className="h-9 w-9"
          variant="outline"
          onClick={handleSettingsClick}
        >
          <Icon.Settings />
        </Button>

        {/* Username */}
        {isChat && (
          <MotionDivWrapper fadeInFromTop key="receiver-username">
            <p>{receiverUsername}</p>
          </MotionDivWrapper>
        )}
      </div>

      {/* Drag Area / Separator */}
      <div ref={electronDragArea} className="h-9 electron-drag" />

      <div
        ref={electronDragAreaCalc}
        className="absolute right-0 top-0 flex justify-end items-center gap-2 pr-2"
      >
        <AnimatePresence>
          {/* Failed Messages */}
          {showFailedMessages && (
            <MotionDivWrapper fadeInFromTop key="failed-messages">
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button className="h-9 w-9" variant="outline">
                    <Icon.TriangleAlert />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-full">
                  <div>{failedMessagesText}</div>
                </HoverCardContent>
              </HoverCard>
            </MotionDivWrapper>
          )}

          {/* Call Button */}
          {isChat && <CallButtonWrapper />}
        </AnimatePresence>

        {/* Electron Window Controls */}
        <WindowControls />
      </div>
    </div>
  );
}
