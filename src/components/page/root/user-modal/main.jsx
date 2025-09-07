// Package Imports
import { toast } from "sonner";
import Image from "next/image";
import * as Icon from "lucide-react";
import { useEffect, useState } from "react";

// Lib Imports
import {
  cn,
  statusColors,
  convertDisplayNameToInitials,
  formatUserStatus,
} from "@/lib/utils";

// Context Imports
import { useUsersContext } from "@/components/context/users";
import { useCryptoContext } from "@/components/context/crypto";
import { useCallContext } from "@/components/context/call";

// Components
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// User Modal for user
export function UserModal({ uuid }) {
  // Loading of user data
  let { get, users } = useUsersContext();
  let [user, setUser] = useState({ loading: true });
  useEffect(() => {
    get(uuid).then((data) => {
      setUser({ loading: false, ...data });
    });
  }, [uuid, users[uuid]]);

  return (
    <div className="rounded-xl flex flex-col items-center p-3 gap-3 justify-center">
      <div className="flex w-full gap-3 items-center">
        <div className="relative w-[35px] h-[35px]">
          {user.loading ? (
            <Skeleton className="rounded-full size-8" />
          ) : (
            <Avatar className="bg-accent/50">
              {user.avatar !== "" ? (
                <Image
                  className="w-auto h-auto object-fill"
                  data-slot="avatar-image"
                  width={36}
                  height={36}
                  src={user.avatar}
                  alt=""
                />
              ) : null}
              <AvatarFallback>
                {convertDisplayNameToInitials(user.username)}
              </AvatarFallback>
            </Avatar>
          )}
          <Tooltip>
            <TooltipTrigger
              asChild
              className="absolute bottom-0 -right-1 w-[15px] h-[15px]"
            >
              <div
                onClick={() => toast("Huhu")}
                className={cn(
                  "cursor-pointer rounded-full border-3 border-card",
                  statusColors[user.state] || "bg-white"
                )}
              />
            </TooltipTrigger>
            <TooltipContent className="border-1">
              <p>{formatUserStatus(user.state)}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="w-full">
          <div className="text-[14px] font-bold">
            {user.loading ? (
              <Skeleton className="h-5 w-32" />
            ) : (
              <p>{user.display}</p>
            )}
          </div>
          <div className="text-[12px] font-bold text-foreground/67">
            {user.loading ? (
              <Skeleton className="h-3 w-28 mt-1" />
            ) : (
              <p>{user.username}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// User Modal for Sidebar Chats
export function SmallUserModal({
  uuid,
  showIotaStatus = false,
  forceLoad = false,
  callActive = false,
  callId = "",
  encCallSecret = "",
}) {
  let [callSecret, setCallSecret] = useState("");
  let [callActiveHover, setCallActiveHover] = useState(false);
  let [showCallActive, setShowCallActive] = useState(callActive);
  let { decrypt_base64_using_aes } = useCryptoContext();
  let { startCall } = useCallContext();

  useEffect(() => {
    if (encCallSecret !== "") {
      async function decrypt() {
        let enc = atob(
          await decrypt_base64_using_aes(
            encCallSecret,
            await get(id).then((data) => data.shared_secret)
          )
        );
        setCallSecret(enc);
      }
      decrypt();
    }
  }, [encCallSecret]);

  // Loading of user data
  let { get, users } = useUsersContext();
  let [user, setUser] = useState({ loading: true });
  useEffect(() => {
    get(uuid).then((data) => {
      setUser({ loading: false, ...data });
    });
  }, [uuid, users[uuid]]);

  return (
    <div className="rounded-xl flex items-center h-12 pl-3 gap-3">
      {!forceLoad && (
        <div className="flex-shrink-0">
          <div className="relative w-[27px] h-[27px] mb-2">
            {user.loading ? (
              <Skeleton className="rounded-full size-8" />
            ) : (
              <Avatar className="bg-accent/50">
                {user.avatar !== "" && (
                  <Image
                    className="w-auto h-auto object-fill"
                    data-slot="avatar-image"
                    width={36}
                    height={36}
                    src={user.avatar}
                    alt=""
                  />
                )}
                <AvatarFallback>
                  {convertDisplayNameToInitials(user.username)}
                </AvatarFallback>
              </Avatar>
            )}
            <Tooltip>
              <TooltipTrigger
                asChild
                className="absolute -bottom-2 -right-2 w-[15px] h-[15px]"
              >
                {user.state === "none" ? (
                  <div className="cursor-pointer rounded-full border-3 border-card bg-card">
                    <Skeleton className="bg-white w-full h-full" />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "cursor-pointer rounded-full border-3 border-card",
                      statusColors[user.state] || "bg-white"
                    )}
                  />
                )}
              </TooltipTrigger>
              <TooltipContent className="border-1">
                <p>{formatUserStatus(user.state)}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      <div className="min-w-0 flex-grow w-full">
        <div
          className={`${showIotaStatus && user.state !== "IOTA_OFFLINE" ? "flex" : ""} gap-2 text-[15px] overflow-hidden whitespace-nowrap text-overflow-ellipsis`}
        >
          <div className="flex flex-col">
            <div className="flex gap-2">
              {!user.loading || forceLoad ? (
                <p>{forceLoad ? "Debug Mode" : user.display}</p>
              ) : (
                <Skeleton className="h-5 w-20" />
              )}
            </div>
            <div className="flex gap-1">
              <p className="text-xs text-foreground/75">
                {forceLoad ? "Chats wont load!" : user.status}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showIotaStatus && user.state === "IOTA_OFFLINE" && (
        <div className="flex justify-center items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="w-7 h-7">
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

export function MiniUserModal({ uuid }) {
  // Loading of user data
  let { get, users } = useUsersContext();
  let [user, setUser] = useState({ loading: true });
  useEffect(() => {
    get(uuid).then((data) => {
      setUser({ loading: false, ...data });
    });
  }, [uuid, users[uuid]]);

  return (
    <div className="rounded-xl flex items-center h-7 gap-3">
      <>
        {user.loading ? (
          <Skeleton className="rounded-full size-8" />
        ) : (
          <Avatar className="bg-accent/50">
            {user.avatar !== "" ? (
              <Image
                className="w-auto h-auto object-fill"
                data-slot="avatar-image"
                width={36}
                height={36}
                src={user.avatar}
                alt=""
              />
            ) : null}
            <AvatarFallback>
              {convertDisplayNameToInitials(user.username)}
            </AvatarFallback>
          </Avatar>
        )}
        {user.loading ? (
          <Skeleton className="h-5 w-20" />
        ) : (
          <p className="text-[15px] overflow-hidden whitespace-nowrap text-overflow-ellipsis">
            {user.display}
          </p>
        )}
      </>
    </div>
  );
}

// Just logo and hover thing | Deprecated
function MiniMiniUserModal({ uuid }) {
  // Loading of user data
  let { get, users } = useUsersContext();
  let [user, setUser] = useState({ loading: true });
  useEffect(() => {
    get(uuid).then((data) => {
      setUser({ loading: false, ...data });
    });
  }, [uuid, users[uuid]]);

  return (
    <div className="rounded-xl flex items-center h-5.5 w-5.5 m-1">
      <Tooltip>
        <TooltipTrigger>
          {user.avatar !== "notAllowed" ? (
            <Avatar className="bg-accent/50 w-[30px] h-[30px] border-1">
              {user.avatar !== "" ? (
                <Image
                  className="w-auto h-auto object-fill"
                  data-slot="avatar-image"
                  width={30}
                  height={30}
                  src={user.avatar}
                  alt=""
                />
              ) : null}
              <AvatarFallback>
                {convertDisplayNameToInitials(user.username)}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </TooltipTrigger>
        <TooltipContent>
          {user.loading ? (
            <p>{user.display}</p>
          ) : (
            <Skeleton className="mr-20">
              <p className="invisible">🥴</p>
            </Skeleton>
          )}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// User Modal for call widget
export function CallModal({ uuid }) {
  // Loading of user data
  let { get, users } = useUsersContext();
  let [user, setUser] = useState({ loading: true });
  useEffect(() => {
    get(uuid).then((data) => {
      setUser({ loading: false, ...data });
    });
  }, [uuid, users[uuid]]);

  return (
    <div className="rounded-xl flex flex-col items-center p-3 gap-3 justify-center">
      <div className="flex flex-col text-center w-full gap-3 items-center">
        <div className="relative">
          {user.loading ? (
            <Skeleton className="rounded-full size-8" />
          ) : (
            <Avatar className="size-40 bg-accent/50 border-1">
              {user.avatar !== "" ? (
                <Image
                  className="w-auto h-auto object-fill"
                  data-slot="avatar-image"
                  width={150}
                  height={150}
                  src={user.avatar}
                  alt=""
                />
              ) : null}
              <AvatarFallback>
                {convertDisplayNameToInitials(user.username)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        <div className="w-full">
          <div className="text-4xl font-bold">
            {user.loading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <p>{user.display}</p>
            )}
          </div>
          <div className="text-lg font-bold text-foreground/67">
            {user.loading ? (
              <Skeleton className="h-3 w-28 mt-1" />
            ) : (
              <p>{user.username}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
