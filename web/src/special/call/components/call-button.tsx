// Package Imports
import * as Icon from "lucide-react";
import { useState } from "react";
import { v7 } from "uuid";

// Context Imports
import { useCallContext } from "@/context/call";
import { useUserContext } from "@/context/user";

// Components
import { MotionDivWrapper } from "@/components/animation/presence";
import { LoadingIcon } from "@/components/loading";
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

// Helper Functions
export function displayCallId(callId: string) {
  try {
    const hex = callId.replace(/-/g, "");

    const int = BigInt(`0x${hex}`);
    const chars =
      "!#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_abcdefghijklmnopqrstuvwxyz{|}~";
    let result = "";
    let n = int;

    while (n > BigInt(0)) {
      result = chars[Number(n % BigInt(85))] + result;
      n = n / BigInt(85);
    }

    return (
      result
        .replaceAll(/[^a-zA-Z0-9]/g, "")
        .slice(4, 12)
        .toUpperCase() || "0"
    );
  } catch {
    return "0";
  }
}

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
      <p>{displayCallId(callId)}</p>
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
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(calls[0] || "");

  return (
    <CallButtonPopover open={open} setOpen={setOpen} callId={value}>
      {calls.length === 1 ? (
        <Button className="w-9 h-9">
          <Icon.Phone />
        </Button>
      ) : calls.length > 2 ? (
        <Select
          value=""
          onValueChange={(value) => {
            setOpen(true);
            setValue(value);
          }}
        >
          <SelectTrigger className={moreRounded ? "rounded-xl" : "rounded-lg"}>
            <Icon.Phone color="var(--foreground)" scale={80} />
          </SelectTrigger>
          <SelectContent>
            {calls.map((callId, index) => (
              <SelectItem key={`${callId}-${index}`} value={callId}>
                {displayCallId(callId)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </CallButtonPopover>
  );
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
        <p>{children}</p>
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
