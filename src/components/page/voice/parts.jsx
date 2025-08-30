// Package Imports
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import * as Icon from "lucide-react";

// Lib Imports
import { convertDisplayNameToInitials, log, sha256 } from "@/lib/utils";
import { endpoint } from "@/lib/endpoints";

// Context Imports
import { useUsersContext } from "@/components/context/users";
import { useCallContext } from "@/components/context/call";
import { useEncryptionContext } from "@/components/context/encryption";
import { useWebSocketContext } from "@/components/context/websocket";
import { useCryptoContext } from "@/components/context/crypto";

// Components
import { CommandDialog, CommandItem } from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MiniUserModal,
  CallModal,
} from "@/components/page/root/user-modal/main";

export function GettingCalled() {
  let { invitedToCall, setInvitedToCall, inviteData, startCall } =
    useCallContext();

  let [callerId, setCallerId] = useState("");
  let [tempCallId, setTempCallId] = useState("");
  let [tempCallSecret, setTempCallSecret] = useState("");
  const ringtoneRef = useRef(null);
  const unlockHandlerRef = useRef(null);
  const invitedToCallRef = useRef(invitedToCall);

  useEffect(() => {
    invitedToCallRef.current = invitedToCall;
  }, [invitedToCall]);

  useEffect(() => {
    setCallerId(inviteData.callerId);
    setTempCallId(inviteData.callId);
    setTempCallSecret(inviteData.callSecret);
  }, [inviteData]);

  useEffect(() => {
    if (!ringtoneRef.current) {
      const audio = new Audio();
      audio.loop = true;
      audio.preload = "auto";
      try {
        audio.load?.();
      } catch (_) {}
      ringtoneRef.current = audio;

      try {
        fetch(endpoint.sound_call, { cache: "force-cache" })
          .then((res) =>
            res.ok
              ? res.blob()
              : Promise.reject(new Error("Failed to fetch ringtone")),
          )
          .then((blob) => {
            const objectUrl = URL.createObjectURL(blob);
            audio.src = objectUrl;
            audio.dataset.objectUrl = objectUrl;
            try {
              audio.load?.();
            } catch (_) {}
          })
          .catch(() => {
            audio.src = endpoint.sound_call;
            try {
              audio.load?.();
            } catch (_) {}
          });
      } catch (_) {
        audio.src = endpoint.sound_call;
        try {
          audio.load?.();
        } catch (_) {}
      }

      unlockHandlerRef.current = async () => {
        try {
          await audio.play();
          audio.pause();
          audio.currentTime = 0;
        } catch (_) {}
        try {
          if (invitedToCallRef.current) {
            await audio.play();
          }
        } catch (_) {}
        document.removeEventListener("pointerdown", unlockHandlerRef.current);
        document.removeEventListener("keydown", unlockHandlerRef.current);
        document.removeEventListener("touchstart", unlockHandlerRef.current);
      };

      document.addEventListener("pointerdown", unlockHandlerRef.current, {
        once: true,
      });
      document.addEventListener("keydown", unlockHandlerRef.current, {
        once: true,
      });
      document.addEventListener("touchstart", unlockHandlerRef.current, {
        once: true,
      });
    }

    return () => {
      if (ringtoneRef.current) {
        try {
          ringtoneRef.current.pause();
          ringtoneRef.current.currentTime = 0;
        } catch (_) {}
        const url = ringtoneRef.current?.dataset?.objectUrl;
        if (url) {
          try {
            URL.revokeObjectURL(url);
          } catch (_) {}
        }
      }
      if (unlockHandlerRef.current) {
        document.removeEventListener("pointerdown", unlockHandlerRef.current);
        document.removeEventListener("keydown", unlockHandlerRef.current);
        document.removeEventListener("touchstart", unlockHandlerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const audio = ringtoneRef.current;
    if (!audio) return;
    let retryHandler;
    if (invitedToCall) {
      audio.play().catch(() => {
        retryHandler = async () => {
          try {
            await audio.play();
          } catch (_) {
            /* ignore */
          }
          document.removeEventListener("pointerdown", retryHandler);
          document.removeEventListener("keydown", retryHandler);
          document.removeEventListener("touchstart", retryHandler);
        };
        document.addEventListener("pointerdown", retryHandler, { once: true });
        document.addEventListener("keydown", retryHandler, { once: true });
        document.addEventListener("touchstart", retryHandler, { once: true });
      });
    } else {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (_) {}
      if (retryHandler) {
        document.removeEventListener("pointerdown", retryHandler);
        document.removeEventListener("keydown", retryHandler);
        document.removeEventListener("touchstart", retryHandler);
      }
    }
    return () => {
      if (retryHandler) {
        document.removeEventListener("pointerdown", retryHandler);
        document.removeEventListener("keydown", retryHandler);
        document.removeEventListener("touchstart", retryHandler);
      }
    };
  }, [invitedToCall]);

  return (
    <CommandDialog
      showCloseButton={false}
      key={invitedToCall}
      open={invitedToCall}
      onOpenChange={setInvitedToCall}
      className="rounded-3xl border shadow-md w-75 h-auto"
    >
      <div className="flex flex-col justify-center items-center w-full gap-5 p-5">
        <CallModal id={callerId} />
        <div className="flex gap-10">
          <Button
            className="size-15 rounded-2xl"
            onClick={async () => {
              startCall(false, tempCallId, tempCallSecret);
              setInvitedToCall(false);
            }}
          >
            <div className="scale-140">
              <Icon.PhoneIncoming />
            </div>
          </Button>
          <Button
            className="size-15 rounded-2xl bg-destructive hover:bg-destructive/90"
            onClick={() => {
              setInvitedToCall(false);
            }}
          >
            <div className="scale-140">
              <Icon.X />
            </div>
          </Button>
        </div>
      </div>
    </CommandDialog>
  );
}

export function VideoStream({ id, local = false, className, onPlay }) {
  let videoRef = useRef(null);
  let { getScreenStream } = useCallContext();
  let [mediaStream, setMediaStream] = useState(null);
  let [update, setUpdate] = useState(0);

  function handlePlay() {
    onPlay(true);
  }

  useEffect(() => {
    if (local) {
      setMediaStream(getScreenStream());
    } else {
      let track = getScreenStream(id);
      if (typeof track !== "undefined") {
        setMediaStream(getScreenStream(id));
      } else {
        setUpdate(update + 1);
      }
      setMediaStream(getScreenStream(id));
    }
  }, [local, update]);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  useEffect(() => {
    let videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener("play", handlePlay);

      return () => {
        videoElement.removeEventListener("play", handlePlay);
      };
    }
  }, []);

  return (
    <video
      className={className}
      ref={videoRef}
      autoPlay
      playsInline
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  );
}

export function User({ id, className, avatarSize }) {
  let [display, setDisplay] = useState("...");
  let [username, setUsername] = useState("...");
  let [avatar, setAvatar] = useState("...");
  let { get } = useUsersContext();

  useEffect(() => {
    get(id).then((data) => {
      setDisplay(data.display);
      setUsername(data.username);
      setAvatar(data.avatar);
    });
  }, [id]);

  return (
    <div
      className={`${className} relative group bg-input/20 rounded-xl flex justify-center items-center`}
    >
      {avatar !== "..." ? (
        <div>
          <Avatar className={`bg-accent/50 border w-${avatarSize} h-full`}>
            {avatar !== "" ? (
              <Image
                className="w-auto h-auto object-fill"
                data-slot="avatar-image"
                width={250}
                height={250}
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
      ) : (
        <Skeleton className="rounded-full size-8" />
      )}
      <div className="group-hover:block hidden absolute bottom-0 left-0 m-2">
        {display}
      </div>
    </div>
  );
}

export function InviteItem({ id, onShouldClose }) {
  let { get } = useUsersContext();
  let { get_shared_secret, encrypt_base64_using_aes } = useEncryptionContext();
  let { privateKey } = useCryptoContext();
  let { send } = useWebSocketContext();
  let { callId, callSecret } = useCallContext();

  let handleInvite = async () => {
    try {
      await send(
        "call_invite",
        {
          message: `Invited ${id} to the call ${callId}`,
          log_level: 0,
        },
        {
          receiver_id: id,
          call_id: callId,
          call_secret: await encrypt_base64_using_aes(
            btoa(callSecret),
            await get_shared_secret(
              privateKey,
              await get(id).then((data) => data.public_key),
            ),
          ),
          call_secret_sha: await sha256(callSecret),
        },
      ).then((data) => {
        if (data.type !== "error") {
          log("Sent Invite", "success");
        } else {
          log(data.log.message, "showError");
        }
      });
    } catch (error) {
      log(`Failed to send invite: ${error}`, "showError");
    } finally {
      onShouldClose(false);
    }
  };

  return (
    <CommandItem onSelect={handleInvite}>
      <MiniUserModal id={id} />
    </CommandItem>
  );
}
