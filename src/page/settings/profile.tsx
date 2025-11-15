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

// Types
type FormState = {
  username: string;
  display: string;
  about: string;
  avatar: string;
  status: string;
};

// Main
const profileFormCache = new Map<string, FormState>();

export default function Page() {
  const { translate, debugLog } = useStorageContext();
  const { send } = useSocketContext();
  const { ownUuid, get, doCustomEdit, ownState, setOwnState } =
    useUserContext();
  const { privateKeyHash } = useCryptoContext();

  const [form, setForm] = useState<FormState | null>(() => {
    return profileFormCache.get(ownUuid) ?? null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (form || profileFormCache.has(ownUuid)) return;
    let cancelled = false;

    (async () => {
      const user = await get(ownUuid, false);
      if (cancelled) return;
      const next: FormState = {
        username: user?.username ?? "",
        display: user?.display ?? "",
        about: user?.about ?? "",
        avatar: user?.avatar ?? "",
        status: user?.status ?? "",
      };
      profileFormCache.set(ownUuid, next);
      setForm(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [get, ownUuid, form]);

  if (!form) return <div />;

  return (
    <div className="flex flex-col gap-4 w-100">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="size-15 border" key={form.avatar}>
            {form.avatar && <AvatarImage src={form.avatar} />}
            <AvatarFallback className="text-2xl">
              {convertStringToInitials(form.display)}
            </AvatarFallback>
          </Avatar>
          {ownState && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute bottom-0 right-0 flex size-4.5 items-center justify-center rounded-full bg-muted">
                  <div
                    className={`size-3 rounded-full border ${getColorFor(
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
          <div className="flex gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onloadend = () => {
                  const avatar = reader.result as string;
                  setForm((prev) => {
                    if (!prev) return prev;
                    const next = { ...prev, avatar };
                    profileFormCache.set(ownUuid, next);
                    return next;
                  });
                };
                reader.readAsDataURL(file);
              }}
              disabled={loading}
            />
            <Button
              variant="destructive"
              disabled={loading || !form.avatar}
              onClick={() => {
                setForm((prev) => {
                  if (!prev) return prev;
                  const next = { ...prev, avatar: "" };
                  profileFormCache.set(ownUuid, next);
                  return next;
                });
              }}
            >
              Remove
            </Button>
          </div>
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
        value={form.display}
        onChange={(e) => {
          const display = e.target.value;
          setForm((prev) => {
            if (!prev) return prev;
            const next = { ...prev, display };
            profileFormCache.set(ownUuid, next);
            return next;
          });
        }}
        disabled={loading}
      />

      <Input
        id="username"
        type="text"
        value={form.username}
        onChange={(e) => {
          const username = e.target.value;
          setForm((prev) => {
            if (!prev) return prev;
            const next = { ...prev, username };
            profileFormCache.set(ownUuid, next);
            return next;
          });
        }}
        disabled={loading}
      />

      <div className="flex w-full flex-col gap-1">
        <Textarea
          value={form.about}
          onChange={(e) => {
            const about = e.target.value;
            setForm((prev) => {
              if (!prev) return prev;
              const next = { ...prev, about };
              profileFormCache.set(ownUuid, next);
              return next;
            });
          }}
          placeholder={translate("PROFILE_PAGE_ABOUT")}
          className="resize-none h-35"
          disabled={loading}
        />
        <p
          className={`text-xs ${form.about.length > 200 && "text-destructive"}`}
        >
          {form.about.length}/200
        </p>
      </div>

      <Button
        onClick={async () => {
          if (form.about.length > 200) {
            toast.error(translate("ERROR_PROFILE_PAGE_UPDATE_FAILED"));
            return;
          }
          setLoading(true);
          try {
            const res = await fetch(change + ownUuid, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                private_key_hash: privateKeyHash,
                username: form.username,
                display: form.display,
                about: form.about,
                avatar: form.avatar,
                status: form.status,
              }),
            });
            if (!res.ok) throw new Error("request_failed");
            const data = await res.json();
            debugLog("PROFILE_PAGE", "DATA_PROFILE_PAGE_UPDATE", data);
            if (data?.type === "error") throw new Error("api_error");

            doCustomEdit(ownUuid, { ...data.data, state: ownState });

            profileFormCache.set(ownUuid, { ...form });

            await send("client_changed", { user_state: ownState }, true);

            toast.success(translate("PROFILE_PAGE_UPDATE_SUCCESS"));
          } catch (err: unknown) {
            debugLog("PROFILE_PAGE", "ERROR_PROFILE_PAGE_UPDATE_FAILED", err);
            toast.error(translate("ERROR_PROFILE_PAGE_UPDATE_FAILED"));
          } finally {
            setLoading(false);
          }
        }}
        disabled={
          loading ||
          form.about.length > 200 ||
          form.username.length > 15 ||
          form.display.length > 15 ||
          form.status.length > 15
        }
      >
        {loading ? <LoadingIcon invert /> : translate("SAVE")}
      </Button>
    </div>
  );
}
