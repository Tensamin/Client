// Package Imports
import * as Icon from "lucide-react";
import { useState } from "react";
import { v7 } from "uuid";

// Context Imports
import { useCallContext } from "@/context/call/CallContext";
import { useUserContext } from "@/context/UserContext";

// Components
import { MotionDivWrapper } from "@/components/animation/Presence";
import LoadingIcon from "@/components/Loading/LoadingIcon";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { displayCallId } from "@/lib/utils";

// Main (For navbar)
export function CallInteraction({
  callId,
  onClose,
}: {
  callId: string;
  onClose: () => void;
}) {
  const { getCallToken, connect, setDontSendInvite } = useCallContext();
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {displayCallId(callId)}
      <Button
        disabled={loading}
        onClick={() => {
          getCallToken(callId).then((token) => {
            setDontSendInvite(true);
            setLoading(true);
            connect(token, callId).then(() => {
              setLoading(false);
              onClose();
            });
          });
        }}
      >
        {loading ? (
          <>
            <LoadingIcon invert />
            <p>Connecting...</p>
          </>
        ) : (
          "Connect"
        )}
      </Button>
    </div>
  );
}

export function CallButton({
  calls,
  moreRounded,
}: {
  calls: string[];
  moreRounded?: boolean;
}) {
  const { getCallToken, setDontSendInvite, connect } = useCallContext();

  const [open, setOpen] = useState(false);

  return calls.length === 1 ? (
    <CallButtonPopover callId={calls[0]} open={open} setOpen={setOpen}>
      <Button className="w-9 h-9">
        <Icon.Phone />
      </Button>
    </CallButtonPopover>
  ) : calls.length > 1 ? (
    <Select
      value=""
      onValueChange={(value) => {
        getCallToken(value).then((token) => {
          setDontSendInvite(true);
          connect(token, value);
        });
      }}
    >
      <SelectTrigger className={moreRounded ? "rounded-xl" : "rounded-lg"}>
        <Icon.Phone color="var(--foreground)" scale={80} />
      </SelectTrigger>
      <SelectContent>
        {calls.map((callId, index) => (
          <SelectItem key={index} value={callId}>
            {displayCallId(callId)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null;
}

export function CallButtonPopover({
  callId,
  children,
  open,
  setOpen,
}: {
  callId: string;
  children: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild className="ml-auto">
        {children}
      </PopoverTrigger>
      <PopoverContent>
        <CallInteraction
          onClose={() => {
            setOpen(false);
          }}
          callId={callId}
        />
      </PopoverContent>
    </Popover>
  );
}

export function CallButtonWrapper() {
  const { conversations, currentReceiverId } = useUserContext();
  const { getCallToken, connect, outerState } = useCallContext();

  const currentUserAlreadyHasACall =
    conversations.find((conv) => conv?.user_id === currentReceiverId)?.calls
      ?.length ?? 0 > 0;

  return currentUserAlreadyHasACall ? (
    <MotionDivWrapper fadeInFromTop key="call-button">
      <CallButton
        key="call-button"
        calls={
          conversations.find((conv) => conv?.user_id === currentReceiverId)
            ?.calls ?? []
        }
      />
    </MotionDivWrapper>
  ) : (
    <MotionDivWrapper fadeInFromTop key="call-button">
      <Button
        className="h-9 w-9"
        variant="outline"
        onClick={() => {
          const callId = v7();
          getCallToken(callId).then((token) => {
            connect(token, callId, currentReceiverId);
          });
        }}
        disabled={outerState === "CONNECTED" || outerState === "CONNECTING"}
      >
        <Icon.Phone />
      </Button>
    </MotionDivWrapper>
  );
}
