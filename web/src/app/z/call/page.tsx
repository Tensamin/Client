"use client";

// Package Imports
import { useParticipants } from "@livekit/components-react";
import { AnimatePresence } from "framer-motion";
import * as Icon from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// Lib Imports
import { User } from "@/lib/types";

// Context Imports
import { useCallContext, useSubCallContext } from "@/context/call";
import { useSocketContext } from "@/context/socket";
import { useUserContext } from "@/context/user";

// Components
import { MotionDivWrapper } from "@/components/animation/presence";
import {
  CameraButton,
  DeafButton,
  MuteButton,
  ScreenShareButton,
} from "@/components/call/components/buttons";
import { displayCallId } from "@/components/call/components/call-button";
import {
  CallPageProvider,
  useCallPageContext,
} from "@/components/call/context";
import { CallFocus } from "@/components/call/focus";
import { CallGrid } from "@/components/call/grid";
import Avatar from "@/components/modals/Avatar";
import { UserModal } from "@/components/modals/user";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

// Main
function CallPageContent() {
  const { conversations } = useUserContext();
  const { disconnect } = useCallContext();
  const { stopWatching, isWatching } = useSubCallContext();
  const {
    focusedTrackRef,
    setFocusedTrackSid,
    hideParticipants,
    setHideParticipants,
  } = useCallPageContext();
  const { callId } = useCallContext();

  const innerCallPageContainer = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);

  const participants = useParticipants();
  const viewers = useMemo(() => {
    return participants.filter((p) => {
      return isWatching[p.identity] ?? false;
    });
  }, [participants, isWatching]);

  return (
    <div className="flex flex-col w-full h-full gap-5 relative pb-11">
      <div className="absolute pl-2 pt-3 h-6 top-0 left-0 flex gap-3 items-center">
        {/* Information */}
        {displayCallId(callId)}

        <AnimatePresence>
          {focusedTrackRef && (
            <MotionDivWrapper fadeInFromTop className="flex gap-3 items-center">
              {/* Separator */}
              {viewers.length > 0 && <div className="w-0.5 h-6 bg-border" />}

              {/* Viewers */}
              <div className="flex -space-x-3 overflow-hidden z-30 items-center">
                <AnimatePresence>
                  {viewers.map((p) => (
                    <MotionDivWrapper
                      className="flex items-center justify-center"
                      fadeInFromTop
                      key={p.identity}
                    >
                      <UserModal id={Number(p.identity)} size="avatar" />
                    </MotionDivWrapper>
                  ))}
                </AnimatePresence>
              </div>
              {viewers.length > 0 && (
                <span>
                  {viewers.length} viewer{viewers.length !== 1 && "s"}
                </span>
              )}
            </MotionDivWrapper>
          )}
        </AnimatePresence>
      </div>
      <div className="flex-1" ref={innerCallPageContainer}>
        {focusedTrackRef ? <CallFocus /> : <CallGrid className="h-full" />}
      </div>
      <div className="absolute bottom-3 left-0 flex justify-center w-full">
        <div className="flex gap-3 bg-card p-1.5 rounded-lg border">
          {/* Mute Button */}
          <MuteButton ghostMode className="w-10" />
          {/* Deaf Button */}
          <DeafButton ghostMode className="w-10" />
          {/* Screen Share Button */}
          <ScreenShareButton ghostMode className="w-10" />
          {/* Camera Button */}
          <CameraButton ghostMode className="w-10" />
          {/* Invite Button */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="w-10 h-9">
                <Icon.MailPlus />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0">
              <Command>
                <CommandInput placeholder="Search conversations..." />
                <CommandList>
                  <CommandEmpty>No conversation found.</CommandEmpty>
                  <CommandGroup>
                    {conversations.map((conversation) => (
                      <UserInInviteSelection
                        userId={conversation.user_id}
                        key={conversation.user_id}
                        onClose={() => {
                          setOpen(false);
                        }}
                      />
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {/* Leave Button */}
          <Button
            className="w-10 h-9"
            variant="destructive"
            onClick={() => {
              if (focusedTrackRef) {
                setFocusedTrackSid(null);
                stopWatching(focusedTrackRef.participant.identity);
              } else {
                disconnect();
              }
            }}
          >
            {focusedTrackRef ? <Icon.X /> : <Icon.LogOut />}
          </Button>
          {/* More Options */}
          <Popover>
            <PopoverTrigger asChild>
              <Button className="w-10 h-9" variant="ghost">
                <Icon.EllipsisVertical />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col gap-2 w-55">
              <div className="flex justify-between">
                <Label htmlFor="hide-participants">Hide Participants</Label>
                <Switch
                  id="hide-participants"
                  checked={hideParticipants}
                  onCheckedChange={setHideParticipants}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

function UserInInviteSelection({
  userId,
  onClose,
}: {
  userId: number;
  onClose: () => void;
}) {
  const { get } = useUserContext();
  const { send } = useSocketContext();
  const { callId } = useCallContext();
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    get(userId, false).then((data) => {
      setUser(data);
    });
  }, [userId, get]);
  return (
    <CommandItem
      value={user?.display}
      onSelect={() => {
        send("call_invite", {
          receiver_id: Number(userId),
          call_id: callId,
        })
          .then(() => {
            toast.success("Call invite sent successfully");
            onClose();
          })
          .catch(() => {
            toast.error("Failed to send call invite");
          });
      }}
    >
      <Avatar
        addBorder
        image={user?.avatar}
        size={10}
        display={user?.display ?? ""}
        loading={!user}
      />
      {user?.display}
    </CommandItem>
  );
}

// Wrapper with Provider
export default function Page() {
  return (
    <CallPageProvider>
      <CallPageContent />
    </CallPageProvider>
  );
}
