"use client";

// Package Imports
import * as Icon from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Lib Imports
import { User } from "@/lib/types";

// Context Imports
import { useCallContext, useSubCallContext } from "@/context/call";
import { useSocketContext } from "@/context/socket";
import { useUserContext } from "@/context/user";

// Components
import { UserAvatar } from "@/components/modals/raw";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CameraButton,
  DeafButton,
  MuteButton,
  ScreenShareButton,
} from "../components/buttons";
import { CallPageProvider, useCallPageContext } from "../context";
import { CallFocus } from "./focus";
import { CallGrid } from "./grid";

// Main
function CallPageContent() {
  const { conversations } = useUserContext();
  const { disconnect } = useCallContext();
  const { stopWatching } = useSubCallContext();
  const { focusedTrackRef, setFocusedTrackSid } = useCallPageContext();

  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col w-full h-full gap-5 relative pb-11">
      <div className="flex-1">
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
          receiver_id: userId,
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
      <UserAvatar
        border
        icon={user?.avatar}
        size="small"
        title={user?.display ?? ""}
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
