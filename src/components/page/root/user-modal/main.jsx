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

// User Modal for user
export function UserModal({ id, state }) {
  let [avatar, setAvatar] = useState("...");
  let [username, setUsername] = useState("...");
  let [display, setDisplay] = useState("...");
  let { get, refetchUser } = useUsersContext();

  useEffect(() => {
    if (id !== "") get(id)
      .then(data => {
        setAvatar(data.avatar);
        setUsername(data.username);
        setDisplay(data.display);
      });
  }, [id, refetchUser])

  return (
    <div className="rounded-xl flex flex-col items-center p-3 gap-3 justify-center">
      <div className="flex w-full gap-3 items-center">
        <div className="relative w-[35px] h-[35px]">
          {avatar !== "..." ? (
            <Avatar className="bg-accent/50">
              {avatar !== "" ? (
                <Image
                  className="w-auto h-auto object-fill"
                  data-slot="avatar-image"
                  width={36}
                  height={36}
                  src={avatar}
                  alt=""
                  onError={() => {
                    setAvatar("")
                  }}
                />
              ) : null}
              <AvatarFallback>
                {convertDisplayNameToInitials(username)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Skeleton className="rounded-full size-8" />
          )}
          <Tooltip>
            <TooltipTrigger asChild className="absolute bottom-0 right-0 w-[15px] h-[15px]">
              <div onClick={() => toast("Huhu")} className={cn("cursor-pointer rounded-full border-3 border-card", statusColors[state] || "bg-white")} />
            </TooltipTrigger>
            <TooltipContent className="border-1">
              <p>{formatUserStatus(state)}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="w-full">
          <div className="text-[14px] font-bold">
            {display !== "..." ?
              <p>{display}</p>
              :
              <Skeleton className="mr-20"><p className="invisible">🥴</p></Skeleton>
            }
          </div>
          <div className="text-[12px] font-bold text-foreground/67">
            {username !== "..." ?
              <p>{username}</p>
              :
              <Skeleton className="mr-8 mt-1"><p className="invisible">🥴</p></Skeleton>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// User Modal for Sidebar Chats
export function SmallUserModal({ id, state, showIotaStatus = false, forceLoad = false, callActive = false, callId = "", encCallSecret = "" }) {
  let [avatar, setAvatar] = useState("...");
  let [username, setUsername] = useState("...");
  let [display, setDisplay] = useState("...");
  let [status, setStatus] = useState("");
  let [callSecret, setCallSecret] = useState("");
  let [callActiveHover, setCallActiveHover] = useState(false);
  let [showCallActive, setShowCallActive] = useState(callActive);
  let { get, refetchUser } = useUsersContext();
  let { privateKey } = useCryptoContext();
  let { decrypt_base64_using_privkey } = useEncryptionContext();
  let { startCall } = useCallContext();

  useEffect(() => {
    if (encCallSecret !== "") {
      async function decrypt() {
        let enc = await decrypt_base64_using_privkey(encCallSecret, privateKey)
        alert(enc)
        setCallSecret(enc)
      }
      decrypt()
    }
  }, [encCallSecret])

  useEffect(() => {
    if (id !== "") get(id)
      .then(data => {
        setAvatar(data.avatar);
        setUsername(data.username);
        setDisplay(data.display);
        setStatus(data.status);
      });
  }, [id, refetchUser])

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
                    src={avatar}
                    alt=""
                    onError={() => {
                      setAvatar("")
                    }}
                  />
                )}
                <AvatarFallback>
                  {convertDisplayNameToInitials(username)}
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

      {showIotaStatus && state === "IOTA_OFFLINE" && (
        <div className="flex justify-center items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="destructive"
                className="w-7 h-7"
              >
                <Icon.Activity />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Iota is Offline</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {showCallActive && (
        <div className="flex justify-center items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                className="w-7 h-7"
                onMouseEnter={() => setCallActiveHover(true)}
                onMouseLeave={() => setCallActiveHover(false)}
                onClick={() => {
                  startCall(false, callId, callSecret);
                  setShowCallActive(false);
                }}
              >
                {callActiveHover ? <Icon.PhoneIncoming /> : <Icon.PhoneCall />}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Join call</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

export function MiniUserModal({ id }) {
  let [avatar, setAvatar] = useState("...");
  let [username, setUsername] = useState("...");
  let [display, setDisplay] = useState("...");
  let { get, refetchUser } = useUsersContext();

  useEffect(() => {
    if (id !== "") get(id)
      .then(data => {
        setAvatar(data.avatar);
        setUsername(data.username);
        setDisplay(data.display);
      });
  }, [id, refetchUser])

  return (
    <div className="rounded-xl flex items-center h-7 gap-3">
      <>
        {avatar !== "..." ? (
          <Avatar className="bg-accent/50">
            {avatar !== "" ? (
              <Image
                className="w-auto h-auto object-fill"
                data-slot="avatar-image"
                width={36}
                height={36}
                src={avatar}
                alt=""
                onError={() => {
                  setAvatar("")
                }}
              />
            ) : null}
            <AvatarFallback>
              {convertDisplayNameToInitials(username)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <Skeleton className="rounded-full size-8" />
        )}
        {display !== "..." ?
          <p className="text-[15px] overflow-hidden whitespace-nowrap text-overflow-ellipsis">{display}</p>
          :
          <Skeleton className="mr-20"><p className="invisible">🥴</p></Skeleton>
        }
      </>
    </div>
  );
}

// Just logo and hover thing
export function MiniMiniUserModal({ id }) {
  let [avatar, setAvatar] = useState("...");
  let [username, setUsername] = useState("...");
  let [display, setDisplay] = useState("...");
  let { get, refetchUser } = useUsersContext();

  useEffect(() => {
    if (id !== "") get(id)
      .then(data => {
        setAvatar(data.avatar);
        setUsername(data.username);
        setDisplay(data.display);
      });
  }, [id, refetchUser])

  return (
    <div className="rounded-xl flex items-center h-5.5 w-5.5 m-1">
      <Tooltip>
        <TooltipTrigger>
          {avatar !== "notAllowed" ? (
            <Avatar className="bg-accent/50 w-[30px] h-[30px] border-1">
              {avatar !== "" ? (
                <Image
                  className="w-auto h-auto object-fill"
                  data-slot="avatar-image"
                  width={30}
                  height={30}
                  src={avatar}
                  alt=""
                  onError={() => {
                    setAvatar("")
                  }}
                />
              ) : null}
              <AvatarFallback>
                {convertDisplayNameToInitials(username)}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </TooltipTrigger>
        <TooltipContent>
          {display !== "..." ?
            <p>{display}</p>
            :
            <Skeleton className="mr-20"><p className="invisible">🥴</p></Skeleton>
          }
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// User Modal for call widget
export function CallModal({ id }) {
  let [avatar, setAvatar] = useState("...");
  let [username, setUsername] = useState("...");
  let [display, setDisplay] = useState("...");
  let { get, refetchUser } = useUsersContext();

  useEffect(() => {
    if (id !== "") get(id)
      .then(data => {
        setAvatar(data.avatar);
        setUsername(data.username);
        setDisplay(data.display);
      });
  }, [id, refetchUser])

  return (
    <div className="rounded-xl flex flex-col items-center p-3 gap-3 justify-center">
      <div className="flex flex-col text-center w-full gap-3 items-center">
        <div className="relative">
          {avatar !== "..." ? (
            <Avatar className="size-40 bg-accent/50 border-1">
              {avatar !== "" ? (
                <Image
                  className="w-auto h-auto object-fill"
                  data-slot="avatar-image"
                  width={150}
                  height={150}
                  src={avatar}
                  alt=""
                  onError={() => {
                    setAvatar("")
                  }}
                />
              ) : null}
              <AvatarFallback>
                {convertDisplayNameToInitials(username)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Skeleton className="rounded-full size-8" />
          )}
        </div>
        <div className="w-full">
          <div className="text-4xl font-bold">
            {display !== "..." ?
              <p>{display}</p>
              :
              <Skeleton className="mr-20"><p className="invisible">🥴</p></Skeleton>
            }
          </div>
          <div className="text-lg font-bold text-foreground/67">
            {username !== "..." ?
              <p>{username}</p>
              :
              <Skeleton className="mr-8 mt-1"><p className="invisible">🥴</p></Skeleton>
            }
          </div>
        </div>
      </div>
    </div>
  )
}