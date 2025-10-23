// Package Imports
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import * as Icon from "lucide-react";

// Context Imports
import { usePageContext } from "@/context/page";
import { useUserContext } from "@/context/user";
import { useStorageContext } from "@/context/storage";

// Components
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { WindowControls } from "@/components/windowControls";
import { MotionDivWrapper } from "@/components/animation/presence";

export function Navbar() {
  const { setPage, page } = usePageContext();
  const { failedMessagesAmount, currentReceiverUuid, get } = useUserContext();
  const { translate } = useStorageContext();
  const [receiverUsername, setReceiverUsername] = useState("");

  useEffect(() => {
    if (currentReceiverUuid) {
      get(currentReceiverUuid, false).then((user) =>
        setReceiverUsername(user.display)
      );
    }
  }, [currentReceiverUuid, get]);

  return (
    <div className="w-full my-2 h-9 flex gap-2 items-center bg-sidebar shrink-0 pr-2">
      {/* Static */}
      <Button
        className="h-9 w-9"
        variant="outline"
        onClick={() => {
          setPage("home");
        }}
      >
        <Icon.Home />
      </Button>
      <Button
        className="h-9 w-9"
        variant="outline"
        onClick={() => {
          setPage("settings");
        }}
      >
        <Icon.Settings />
      </Button>

      {/* Dynamic */}
      <AnimatePresence initial={false} key="navbar-dynamic-elements">
        {/* Only when user is selected */}
        {page === "chat" && (
          <MotionDivWrapper key="receiver-username">
            <p>{receiverUsername}</p>
          </MotionDivWrapper>
        )}
        <div className="w-full" />
        {failedMessagesAmount > 0 && page === "chat" && (
          <MotionDivWrapper key="failed-messages">
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button className="h-9 w-9" variant="outline">
                  <Icon.TriangleAlert />
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-full">
                <div>
                  {failedMessagesAmount +
                    translate(
                      failedMessagesAmount === 1
                        ? "FAILED_MESSAGES_SINGLE"
                        : "FAILED_MESSAGES_MULTIPLE"
                    )}
                </div>
              </HoverCardContent>
            </HoverCard>
          </MotionDivWrapper>
        )}
        {page === "chat" && (
          <MotionDivWrapper key="call-button">
            <Button className="h-9 w-9" variant="outline">
              <Icon.Phone />
            </Button>
          </MotionDivWrapper>
        )}

        {/* Electron Window Controls */}
        <WindowControls key="electron-window-controls" />
      </AnimatePresence>
    </div>
  );
}
