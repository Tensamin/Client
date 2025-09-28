"use client";

// Package Imports
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Lib Imports
import { change } from "@/lib/endpoints";
import { convertStringToInitials, getColorFor } from "@/lib/utils";

// Context Imports
import { useStorageContext } from "@/context/storage";
import { useSocketContext } from "@/context/socket";
import { useUserContext } from "@/context/user";
import { useCryptoContext } from "@/context/crypto";

// Components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingIcon } from "@/components/loading";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Main
export default function Page() {
  const { translate, debugLog } = useStorageContext();
  const { send } = useSocketContext();
  const { ownUuid, get, doCustomEdit, ownState, setOwnState } =
    useUserContext();
  const { privateKeyHash } = useCryptoContext();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [about, setAbout] = useState("");
  const [avatar, setAvatar] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    get(ownUuid, false).then((user) => {
      if (!user) return;
      setUsername(user.username ?? "");
      setDisplayName(user.display ?? "");
      setAbout(user.about ?? "");
      setAvatar(user.avatar ?? "");
      setStatus(user.status ?? "");
    });
  }, [get, ownUuid]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="size-15">
            {avatar && <AvatarImage src={avatar} />}
            <AvatarFallback>
              {convertStringToInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          {ownState && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-full absolute bg-muted bottom-0 right-0 w-4.5 h-4.5 flex justify-center items-center">
                  <div
                    className={`w-3 h-3 rounded-full border ${getColorFor(
                      ownState
                    )}`}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>{translate("STATUS_" + ownState)}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onloadend = () => {
                setAvatar(reader.result as string);
              };
              reader.readAsDataURL(file);
            }}
            disabled //={loading}
          />
          <Select
            value={ownState}
            onValueChange={setOwnState}
            disabled={loading}
          >
            <SelectTrigger className="w-full">
              {translate("STATUS_" + ownState)}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ONLINE">
                {translate("STATUS_ONLINE")}
              </SelectItem>
              <SelectItem value="IDLE">{translate("STATUS_IDLE")}</SelectItem>
              <SelectItem value="DND">{translate("STATUS_DND")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Input
        id="display"
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        disabled={loading}
      />
      <Input
        id="username"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={loading}
      />
      <Textarea
        value={about}
        onChange={(e) => setAbout(e.target.value)}
        placeholder={translate("PROFILE_PAGE_ABOUT")}
        disabled={loading}
      />
      <Button
        onClick={async () => {
          setLoading(true);
          try {
            await fetch(change + ownUuid, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                private_key_hash: privateKeyHash,

                username,
                display: displayName,
                about,
                avatar,
                status,
              }),
            })
              .then((res) => {
                if (!res.ok) throw new Error();
                return res.json();
              })
              .then((data) => {
                doCustomEdit(ownUuid, {
                  ...data.data,
                  state: ownState,
                });
              })
              .catch((err: unknown) => {
                debugLog(
                  "PROFILE_PAGE",
                  "ERROR_PROFILE_PAGE_UPDATE_FAILED",
                  err
                );
                throw new Error();
              });
            await send(
              "client_changed",
              {
                user_state: ownState,
              },
              true
            );
            toast.success(translate("PROFILE_PAGE_UPDATE_SUCCESS"));
          } catch {
            toast.error(translate("ERROR_PROFILE_PAGE_UPDATE_FAILED"));
          } finally {
            setLoading(false);
          }
        }}
        disabled={loading}
      >
        {loading ? <LoadingIcon invert /> : translate("SAVE")}
      </Button>
    </div>
  );
}
