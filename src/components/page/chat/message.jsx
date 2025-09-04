// Package Imports
import React, { useEffect, useState } from "react";
import * as Icon from "lucide-react";
import Image from "next/image";

// Lib Imports
import { convertDisplayNameToInitials, copyTextToClipboard } from "@/lib/utils";

// Context Imports
import { useUsersContext } from "@/components/context/users";
import { useMessageContext } from "@/components/context/message";

// Components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { SmolMessage } from "@/components/page/chat/smol_message";

// Main
export function Message({ message }) {
  let dateObject = new Date(message.id);
  let is24HourClock = true;

  let [username, setUsername] = useState("...");
  let [display, setDisplay] = useState("...");
  let [avatar, setAvatar] = useState("");

  let { get } = useUsersContext();
  let { receiver } = useMessageContext();

  useEffect(() => {
    if (message.sender !== "") {
      get(message.sender).then((data) => {
        setUsername(data.username);
        setDisplay(data.display);
        setAvatar(data.avatar);
      });
    }
  }, [message.sender, receiver]);

  try {
    let dtfForClockCheck = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      hour12: true,
    });
    let testDate = new Date(2000, 0, 1, 13, 0, 0);
    let formattedTestTime = dtfForClockCheck.format(testDate);
    is24HourClock =
      !formattedTestTime.includes("AM") && !formattedTestTime.includes("PM");
  } catch (err) {
    log(err.message, "error");
  }

  let options = {
    hour: "numeric",
    minute: "numeric",
    hour12: !is24HourClock,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  let timestamp = new Intl.DateTimeFormat(undefined, options).format(
    dateObject,
  );

  return message.subMessages ? (
    <div className="w-full flex mb-3 mt-3">
      <ContextMenu>
        <ContextMenuTrigger>
          <div className="border-1 rounded-xl p-2 min-w-60 bg-input/20 hover:bg-input/23">
            <div className="flex items-center gap-3">
              <div className="w-[35px] h-[35px]">
                <Avatar className="bg-accent/50">
                  {avatar !== "" ? (
                    <Image
                      className="w-auto h-auto object-fill"
                      data-slot="avatar-imaasdge"
                      width={36}
                      height={36}
                      src={avatar}
                      alt=""
                      onError={() => {
                        setAvatar("");
                      }}
                    />
                  ) : null}
                  <AvatarFallback>
                    {convertDisplayNameToInitials(username)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="text-[15px] w-full font-bold">
                {display}
                <p className="text-[11.5px] text-foreground/67 pt-0.5">
                  {timestamp}
                </p>
              </div>
            </div>
            <div className="text-sm break-all">
              {message.subMessages.map((message, index) => {
                return message.content !== "" ? (
                  <div key={index}>
                    <div className="p-1">
                      <Separator className="bg-border/40" />
                    </div>
                    <SmolMessage
                      message={message}
                      sendToServer={message.sendToServer}
                    />
                  </div>
                ) : (
                  <div key={index}>
                    <div className="p-1">
                      <Separator className="bg-border/40" />
                    </div>
                    <SmolMessage sendToServer={false} failed />
                  </div>
                );
              })}
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuItem
            onClick={() => {
              copyTextToClipboard(new Date(message.id));
            }}
          >
            <Icon.Calendar /> Copy Date
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              copyTextToClipboard(message.id);
            }}
          >
            <Icon.Cpu /> Copy UNIX Time
          </ContextMenuItem>
          <ContextMenuItem
            disabled={avatar === ""}
            onClick={() => {
              copyTextToClipboard(avatar);
            }}
          >
            <Icon.User /> Copy Avatar
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  ) : null;
}

export function MessageLoading({ amount }) {
  return (
    <div
      className="w-full flex mb-3 mt-3"
      role="status"
      aria-busy="true"
      aria-label="Loading message"
    >
      <div className="border-1 rounded-xl p-2 min-w-60 bg-input/20 hover:bg-input/23">
        <div className="flex items-center gap-3">
          <div className="w-[35px] h-[35px]">
            <Skeleton className="h-[35px] w-[35px] rounded-full" />
          </div>

          <div className="text-[15px] w-full font-bold">
            <Skeleton className="h-4 w-40" />
            <p className="text-[11.5px] text-foreground/67 pt-0.5">
              <Skeleton className="h-3 w-24" />
            </p>
          </div>
        </div>

        <div className="text-sm break-all mt-2">
          {Array.from({ length: amount }).map((_, index) => (
            <div key={index} >
              <div className="p-1">
                <div className="h-px bg-border/40" />
              </div>

              <div className="flex flex-col gap-2 py-1">
                <Skeleton className="h-4 w-[87%]" />
                <Skeleton className="h-4 w-[60%]" />
                <Skeleton className="h-4 w-[75%]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
