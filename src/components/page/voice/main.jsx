// Package Imports
import React, {
  useEffect,
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
} from "react";
import * as Icon from "lucide-react";
import Image from "next/image";

// Lib Imports
import { convertDisplayNameToInitials } from "@/lib/utils";

// Context Imports
import { useUsersContext } from "@/components/context/users";
import { useCallContext } from "@/components/context/call";

// Components
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteItem, VideoStream } from "@/components/page/voice/parts";

// Tunables
let AVATAR_TILE_WIDTH = 96;
let TILE_GAP = 16;

// Main
export function Main() {
  let { ownUuid, chatsArray } = useUsersContext();
  let { connected, connectedUsers, streamingUsers } = useCallContext();

  let [inviteOpen, setInviteOpen] = useState(false);
  let [focused, setFocused] = useState("");

  // Draggable positions: { [userId]: { x, y } }
  let [positions, setPositions] = useState({});
  let canvasRef = useRef(null);
  let { width: canvasW } = useElementSize(canvasRef);

  useEffect(() => {
    if (!canvasW) return;
    setPositions((prev) => {
      let next = { ...prev };

      // Remove stale users
      Object.keys(next).forEach((id) => {
        if (!connectedUsers.includes(id)) delete next[id];
      });

      // New users: simple grid layout
      let cols = Math.max(
        1,
        Math.floor((canvasW + TILE_GAP) / (AVATAR_TILE_WIDTH + TILE_GAP))
      );
      connectedUsers.forEach((user, i) => {
        if (next[user]) return;
        let r = Math.floor(i / cols);
        let c = i % cols;
        next[user] = {
          x: c * (AVATAR_TILE_WIDTH + TILE_GAP),
          y: r * (AVATAR_TILE_WIDTH + TILE_GAP),
        };
      });

      return next;
    });
  }, [connectedUsers, canvasW]);

  // Drag handlers
  let startDrag = useCallback(
    (id) => (e) => {
      e.preventDefault();
      e.stopPropagation();

      let startX = e.clientX;
      let startY = e.clientY;
      let startPos = positions[id] || { x: 0, y: 0 };

      let handleMove = (ev) => {
        let dx = ev.clientX - startX;
        let dy = ev.clientY - startY;
        setPositions((prev) => ({
          ...prev,
          [id]: { x: startPos.x + dx, y: startPos.y + dy },
        }));
      };

      let handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [positions]
  );

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-hidden">
      {/* Top bar */}
      <div className="flex w-full gap-2">
        <Button
          className={`gap-2 ${
            connected ? "" : "bg-destructive hover:bg-destructive/90"
          }`}
        >
          {connected ? (
            <>
              <Icon.Wifi /> Connected
            </>
          ) : (
            <>
              <Icon.WifiOff /> Disconnected
            </>
          )}
        </Button>

        <Button
          className="h-9 gap-2"
          onClick={() => setInviteOpen(true)}
          disabled={!connected}
        >
          <Icon.Send /> Invite
        </Button>

        <CommandDialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <CommandInput placeholder="Search for a Friend..." />
          <CommandList>
            <CommandEmpty>No friends to invite.</CommandEmpty>
            <CommandGroup>
              {chatsArray.map((chat) => (
                <InviteItem
                  id={chat.user_id}
                  key={chat.user_id}
                  onShouldClose={setInviteOpen}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </div>

      {/* Content */}
      <div className="flex w-full flex-1 min-h-0 flex-col">
        {focused === "" ? (
          <div
            ref={canvasRef}
            className="relative flex-1 min-h-0 w-full overflow-hidden rounded-xl border border-border bg-background/40"
          >
            {/* Centered Volume icon with 3 rings */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="relative h-28 w-28">
                <Icon.Volume2
                  className="absolute left-1/2 top-1/2 z-10 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-foreground"
                />
                <span
                  className="absolute inset-0 rounded-full border border-border/75"
                />
                <span
                  className="absolute -inset-10 rounded-full border border-border/50"
                />
                <span
                  className="absolute -inset-20 rounded-full border border-border/25"
                />
              </div>
            </div>

            {/* Draggable avatars */}
            {connectedUsers.map((user) => {
              let pos = positions[user] || { x: 0, y: 0 };
              return (
                <div
                  key={`free-${user}`}
                  className="absolute"
                  style={{
                    transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
                    width: `${AVATAR_TILE_WIDTH}px`,
                  }}
                >
                  <VoiceModal
                    id={user}
                    streams={streamingUsers.includes(user)}
                    focused={false}
                    onFocus={(focus) => {
                      if (focus) setFocused(user);
                    }}
                    mode="avatarOnly"
                    dragHandleProps={{
                      onPointerDown: startDrag(user),
                      className: "cursor-grab active:cursor-grabbing",
                      title: "Drag",
                    }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex w-full flex-1 min-h-0 flex-col gap-2">
            {/* Focused area (fits within remaining height) */}
            <div className="flex-1 min-h-0 px-1">
              <div className="mx-auto h-full w-full max-w-screen-xl">
                <VoiceModal
                  id={focused}
                  streams={streamingUsers.includes(focused)}
                  onFocus={(focus) => {
                    if (focus) setFocused("");
                  }}
                  focused={true}
                  fitToParent={true}
                />
              </div>
            </div>

            {/* Thumbnail rail (always visible) */}
            <div className="flex w-full flex-none gap-2 overflow-x-auto px-1 pb-1 pt-2">
              {connectedUsers.map((user) =>
                focused === user ? null : (
                  <div
                    key={`thumb-${user}`}
                    className="w-[280px] flex-shrink-0"
                  >
                    <VoiceModal
                      id={user}
                      streams={streamingUsers.includes(user)}
                      onFocus={(focus) => {
                        if (focus) setFocused(user);
                      }}
                      focused={false}
                    />
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VoiceModal({
  id,
  streams = false,
  focused = false,
  onFocus,
  dragHandleProps = {},
  mode = "tile",
  fitToParent = false,
}) {
  let [avatar, setAvatar] = useState("...");
  let [username, setUsername] = useState("...");
  let [display, setDisplay] = useState("...");
  let [loading, setLoading] = useState(true);

  let { get, ownUuid } = useUsersContext();
  let { watchingUsers, voiceSend } = useCallContext();

  useEffect(() => {
    let isMounted = true;
    if (id !== "") {
      get(id).then((data) => {
        if (!isMounted) return;
        setAvatar(data.avatar);
        setUsername(data.username);
        setDisplay(data.display);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [id, get]);

  let isWatching = watchingUsers.includes(id);
  let showVideo = streams && id !== ownUuid;

  let fitAreaRef = useRef(null);
  let fit = useFitBox(fitAreaRef, 16, 9);

  if (mode === "avatarOnly") {
    return (
      <div
        className="flex items-center justify-center"
        {...dragHandleProps}
        onDoubleClick={() => onFocus(true)}
        title="Double-click to focus"
      >
        {avatar !== "..." ? (
          <button
            className="inline-flex items-center justify-center rounded-full border bg-background/60 p-1 hover:bg-background"
            onClick={() => onFocus(true)}
          >
            <Avatar className="size-14 bg-background/10">
              {avatar !== "" ? (
                <Image
                  className="object-cover"
                  data-slot="avatar-image"
                  width={80}
                  height={80}
                  src={avatar}
                  alt=""
                  onError={() => setAvatar("")}
                />
              ) : null}
              <AvatarFallback>
                {convertDisplayNameToInitials(username)}
              </AvatarFallback>
            </Avatar>
          </button>
        ) : (
          <Skeleton className="size-14 rounded-full" />
        )}
      </div>
    );
  }

  return (
    <Card
      className={`
        flex w-full flex-col overflow-hidden rounded-2xl p-3
        ${fitToParent ? "h-full" : ""}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-input bg-input/30 p-2">
          <div className="shrink-0" {...dragHandleProps}>
            {avatar !== "..." ? (
              <Avatar className="size-8 bg-accent border">
                {avatar !== "" ? (
                  <Image
                    className="object-cover"
                    data-slot="avatar-image"
                    width={100}
                    height={100}
                    src={avatar}
                    alt=""
                    onError={() => setAvatar("")}
                  />
                ) : null}
                <AvatarFallback>
                  {convertDisplayNameToInitials(username)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Skeleton className="size-8 rounded-full" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {display !== "..." ? (
              <p className="truncate">{display}</p>
            ) : (
              <Skeleton className="h-4 w-20" />
            )}
          </div>
        </div>

        <Button
          className="h-auto rounded-xl p-2"
          variant="outline"
          onClick={() => onFocus(true)}
          title={focused ? "Shrink" : "Expand"}
        >
          {focused ? <Icon.Shrink /> : <Icon.Expand />}
        </Button>
      </div>

      {/* Body: strict 16:9 with two render modes */}
      {fitToParent ? (
        // Fit to parent available height (keeps thumbnails visible)
        <div ref={fitAreaRef} className="relative mt-2 grid h-full place-items-center">
          <div
            className="relative overflow-hidden rounded-xl border bg-background/40"
            style={{
              width: `${fit.width || 0}px`,
              height: `${fit.height || 0}px`,
            }}
          >
            {renderVideoOrPlaceholder({
              showVideo,
              isWatching,
              loading,
              setLoading,
              id,
              ownUuid,
              voiceSend,
              onFocus,
            })}
          </div>
        </div>
      ) : (
        // Regular tile with aspect box
        <div className="relative mt-2 w-full overflow-hidden rounded-xl border bg-background/40 aspect-[16/9]">
          {renderVideoOrPlaceholder({
            showVideo,
            isWatching,
            loading,
            setLoading,
            id,
            ownUuid,
            voiceSend,
            onFocus,
          })}
        </div>
      )}
    </Card>
  );
}

function renderVideoOrPlaceholder({
  showVideo,
  isWatching,
  loading,
  setLoading,
  id,
  ownUuid,
  voiceSend,
  onFocus,
}) {
  if (showVideo) {
    if (isWatching) {
      return (
        <>
          {loading && (
            <Skeleton className="absolute inset-0 h-full w-full rounded-xl" />
          )}
          <VideoStream
            className={`absolute inset-0 h-full w-full ${
              loading ? "hidden" : ""
            } object-contain`}
            id={id}
            key={id}
            onPlay={() => setLoading(false)}
          />
        </>
      );
    }
    return (
      <Button
        className="absolute inset-0 flex h-full w-full items-center justify-center rounded-xl text-lg"
        variant="outline"
        onClick={() => {
          onFocus(true);
          voiceSend(
            "watch_stream",
            {
              message: `${ownUuid} wants to watch ${id}`,
              log_level: 0,
            },
            {
              want_to_watch: true,
              receiver_id: id,
            },
            false
          );
        }}
      >
        Watch Stream…
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onFocus(true)}
      className="absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-3 p-4"
    >
      <Avatar className="size-16 border bg-background/10">
        {/* Avatar image set by parent VoiceModal */}
        <AvatarFallback className="text-lg">{/* fallback handled */}</AvatarFallback>
      </Avatar>
    </button>
  );
}

function useElementSize(ref) {
  let [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    let el = ref.current;
    let ro = new ResizeObserver((entries) => {
      for (let entry of entries) {
        let cr = entry.contentRect;
        setSize({ width: cr.width, height: cr.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function useFitBox(containerRef, aspectW = 16, aspectH = 9) {
  let { width, height } = useElementSize(containerRef);
  let [box, setBox] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!width || !height) {
      setBox({ width: 0, height: 0 });
      return;
    }
    let aspect = aspectW / aspectH;
    let w = width;
    let h = w / aspect;
    if (h > height) {
      h = height;
      w = h * aspect;
    }
    setBox({ width: Math.floor(w), height: Math.floor(h) });
  }, [width, height, aspectW, aspectH]);

  return box;
}