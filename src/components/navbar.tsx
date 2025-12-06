// Package Imports
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { v7 } from "uuid";
import * as Icon from "lucide-react";

// Context Imports
import { usePageContext } from "@/context/page";
import { useUserContext } from "@/context/user";
import { useCallContext } from "@/context/call";

// Components
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { WindowControls } from "@/components/windowControls";
import { MotionDivWrapper } from "@/components/animation/presence";
import { CallButton } from "@/components/modals/raw";

// Main
export function Navbar() {
  const { setPage, page } = usePageContext();
  const { failedMessagesAmount, currentReceiverId, get, conversations } =
    useUserContext();
  const { outerState, getCallToken, connect } = useCallContext();
  const [receiverUsername, setReceiverUsername] = useState("");

  useEffect(() => {
    if (currentReceiverId) {
      get(currentReceiverId, false).then((user) =>
        setReceiverUsername(user.display),
      );
    }
  }, [currentReceiverId, get]);

  const currentUserAlreadyHasACall = conversations.find(
    (conv) =>
      conv.user_id === currentReceiverId && (conv.calls?.length ?? 0) > 0,
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
        <div key="electron-drag" className="w-full h-9 electron-drag" />

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
                  {failedMessagesAmount === 1
                    ? "Failed to load 1 message"
                    : `${failedMessagesAmount} messages failed to load`}
                </div>
              </HoverCardContent>
            </HoverCard>
          </MotionDivWrapper>
        )}

        {/* Call Button */}
        {page === "chat" &&
          (currentUserAlreadyHasACall ? (
            <MotionDivWrapper key="call-button">
              <CallButton
                key="call-button"
                calls={
                  conversations.find(
                    (conv) => conv?.user_id === currentReceiverId,
                  )?.calls ?? []
                }
              />
            </MotionDivWrapper>
          ) : (
            <MotionDivWrapper key="call-button">
              <Button
                className="h-9 w-9"
                variant="outline"
                onClick={() => {
                  const callId = v7();
                  getCallToken(callId).then((token) => {
                    connect(token, callId);
                  });
                }}
                disabled={
                  outerState === "CONNECTED" || outerState === "CONNECTING"
                }
              >
                <Icon.Phone />
              </Button>
            </MotionDivWrapper>
          ))}

        {/* Electron Window Controls */}
        <WindowControls key="electron-window-controls" />
      </AnimatePresence>
    </div>
  );
}
