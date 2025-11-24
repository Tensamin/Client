// Package Imports
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import * as Icon from "lucide-react";

// Context Imports
import { usePageContext } from "@/context/page";
import { useUserContext } from "@/context/user";
import { useStorageContext } from "@/context/storage";
import { useCallContext, useSubCallContext } from "@/context/call";

// Components
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { WindowControls } from "@/components/windowControls";
import { MotionDivWrapper } from "@/components/animation/presence";

// Main
export function Navbar() {
  const { setPage, page } = usePageContext();
  const { failedMessagesAmount, currentReceiverUuid, get, conversations } =
    useUserContext();
  const { translate } = useStorageContext();
  const { outerState, callUser, getCallToken, connect, setToken } =
    useCallContext();
  const [receiverUsername, setReceiverUsername] = useState("");

  useEffect(() => {
    if (currentReceiverUuid) {
      get(currentReceiverUuid, false).then((user) =>
        setReceiverUsername(user.display)
      );
    }
  }, [currentReceiverUuid, get]);

  const currentUserAlreadyHasACall = conversations.find(
    (conv) => conv.user_id === currentReceiverUuid && conv.call_id
  );

  return (
    <div className="w-full my-2 h-9 flex gap-2 items-center bg-sidebar shrink-0 pr-2">
      {/* Homepage Button */}
      <Button
        className="h-9 w-9"
        variant="outline"
        onClick={() => {
          setPage("home");
        }}
      >
        <Icon.Home />
      </Button>

      {/* Settings Button */}
      <Button
        className="h-9 w-9"
        variant="outline"
        onClick={() => {
          setPage("settings");
        }}
      >
        <Icon.Settings />
      </Button>

      {/* Dynamic Elements */}
      <AnimatePresence key="navbar-dynamic-elements">
        {/* Username */}
        {page === "chat" && (
          <MotionDivWrapper fadeInFromTop key="receiver-username">
            <p>{receiverUsername}</p>
          </MotionDivWrapper>
        )}
        <div className="w-full h-9 electron-drag" />

        {/* Failed Messages */}
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

        {/* Call Button */}
        {page === "chat" && (
          <MotionDivWrapper key="call-button">
            <Button
              className="h-9 w-9"
              variant={!currentUserAlreadyHasACall?.call_id ? null : "outline"}
              onClick={() => {
                currentUserAlreadyHasACall?.call_id
                  ? getCallToken(currentUserAlreadyHasACall.call_id).then(
                      (token) => {
                        setToken(token);
                        connect();
                      }
                    )
                  : callUser(currentReceiverUuid);
              }}
              disabled={
                outerState === "CONNECTED" || outerState === "CONNECTING"
              }
            >
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
