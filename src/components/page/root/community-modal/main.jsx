// Package Imports
import { toast } from "sonner"
import Image from "next/image"
import * as Icon from "lucide-react"
import { useEffect, useState } from "react"

// Lib Imports
import {
  cn,
  statusColors,
  convertDisplayNameToInitials,
  formatUserStatus,
} from "@/lib/utils"

// Context Imports
import { useUsersContext } from "@/components/context/users"

// Components
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCryptoContext } from "@/components/context/crypto";
import { useEncryptionContext } from "@/components/context/encryption";
import { useCallContext } from "@/components/context/call"

// User Modal for Sidebar Chats
export function SmallCommunityModal({ ip, port, secure, state, forceLoad = false }) {

    return (
    <div className="rounded-xl flex items-center h-12 pl-3 gap-3">
      {!forceLoad && (
        <div className="flex-shrink-0">
          <div className="relative w-[27px] h-[27px] mb-2">
            {avatar !== "..." ? (
              <Avatar className="bg-accent/50">
                {avatar !== "" && (
                  <Image
                    className="w-auto h-auto object-fill"
                    data-slot="avatar-image"
                    width={36}
                    height={36}
                    src={logo}
                    alt=""
                    onError={() => {
                      setLogo("")
                    }}
                  />
                )}
                <AvatarFallback>
                  {convertDisplayNameToInitials(communityname)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Skeleton className="rounded-full size-8" />
            )}
            <Tooltip>
              <TooltipTrigger asChild className="absolute -bottom-2 -right-2 w-[15px] h-[15px]">
                {state === "none" ?
                  <div className="cursor-pointer rounded-full border-3 border-card bg-card">
                    <Skeleton className="bg-white w-full h-full" />
                  </div>
                  :
                  <div className={cn("cursor-pointer rounded-full border-3 border-card", statusColors[state] || "bg-white")} />
                }
              </TooltipTrigger>
              <TooltipContent className="border-1">
                <p>{formatUserStatus(state)}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      <div className="min-w-0 flex-grow w-full">
        <div className={`${showIotaStatus && state !== "IOTA_OFFLINE" ? "flex" : ""} gap-2 text-[15px] overflow-hidden whitespace-nowrap text-overflow-ellipsis`}>
          <div className="flex flex-col">
            <div className="flex gap-2">
              {display !== "..." || forceLoad ?
                <p>{forceLoad ? "Debug Mode" : display}</p>
                :
                <Skeleton><p className="invisible">Tensamin :3</p></Skeleton>
              }
            </div>
            <div className="flex gap-1">
              <p className="text-xs text-foreground/75">{forceLoad ? "Chats wont load!" : status}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}