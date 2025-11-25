"use client";

// Package Imports
import { useCallback, useState, useEffect } from "react";
import { toast } from "sonner";

// Lib Imports
import { call_token, username_to_uuid } from "@/lib/endpoints";
import { handleError } from "@/lib/utils";

// Context Imports
import { useSocketContext } from "@/context/socket";
import { useUserContext } from "@/context/user";
import { useStorageContext } from "@/context/storage";
import { useCallContext } from "@/context/call";
import { useCryptoContext } from "@/context/crypto";

// Components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingIcon } from "@/components/loading";
import { PageDiv } from "@/components/pageDiv";
import { UserModal } from "@/components/modals/user";

// Main
export default function Page() {
  const { send } = useSocketContext();
  const { refetchConversations, ownUuid, appUpdateInformation } =
    useUserContext();
  const { translate } = useStorageContext();
  const { privateKeyHash } = useCryptoContext();
  const { setToken, connect } = useCallContext();

  const [open, setOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const addConversation = useCallback(async () => {
    setLoading(true);
    try {
      await fetch(username_to_uuid + newUsername)
        .then((res) => res.json())
        .then(async (data) => {
          if (data.type === "error") {
            toast.error(translate("ERROR_HOME_PAGE_ADD_CONVERSATION_FAILED"));
          } else {
            await send("add_chat", {
              user_id: data.data.user_id,
            }).then(async (data) => {
              if (data.type !== "error") {
                await refetchConversations();
              }
            });
          }
        });
    } catch (err: unknown) {
      handleError("HOME_PAGE", "ERROR_ADD_CONVERSATION_UNKNOWN", err);
    } finally {
      setOpen(false);
      setNewUsername("");
      setLoading(false);
    }
  }, [newUsername, refetchConversations, send, translate]);

  return (
    <PageDiv className="flex flex-col gap-4 h-full">
      <div className="flex gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              {translate("HOME_PAGE_ADD_CONVERSATION_LABEL")}
            </Button>
          </DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>
                {translate("HOME_PAGE_ADD_CONVERSATION_LABEL")}
              </DialogTitle>
              <DialogDescription>
                {translate("HOME_PAGE_ADD_CONVERSATION_DESCRIPTION")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <div className="flex flex-col gap-2 w-full">
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addConversation();
                    }
                  }}
                  placeholder={translate(
                    "HOME_PAGE_ADD_CONVERSATION_INPUT_PLACEHOLDER"
                  )}
                  className="w-full"
                />
                <div className="flex gap-2">
                  <div className="w-full" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    {translate("CANCEL")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={addConversation}
                    disabled={!newUsername || loading}
                  >
                    {loading ? (
                      <LoadingIcon invert />
                    ) : (
                      translate("HOME_PAGE_ADD_CONVERSATION_LABEL")
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button size="sm" disabled>
          {translate("HOME_PAGE_ADD_COMMUNITY_LABEL")}
        </Button>
      </div>
      <p>{translate("HOME_PAGE_PLACEHOLDER_MESSAGE")}</p>
      <UserModal size="profile" uuid={ownUuid} />
      <div>
        {/*
        {Array.from(participants.entries()).map(([userId]) => {
          const user = participants.get(userId);
          return (
            userId !== ownUuid && (
              <div className="flex items-center gap-2" key={userId}>
                <Checkbox checked={user?.active} />
                <span>
                  {translate("HOME_PAGE_ACTIVE_STATUS")} [{userId}]
                </span>
              </div>
            )
          );
        })}
          */}
      </div>
      <div className="mt-auto">
        {appUpdateInformation && (
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
            <div className="flex-1">
              <p className="font-medium">
                {translate("HOME_PAGE_UPDATE_AVAILABLE") || "Update Available"}
              </p>
              <p className="text-sm text-muted-foreground">
                {appUpdateInformation.releaseName}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                // @ts-expect-error ElectronAPI only available in Electron
                if (window.electronAPI?.doUpdate) {
                  // @ts-expect-error ElectronAPI only available in Electron
                  window.electronAPI.doUpdate();
                }
              }}
            >
              {translate("HOME_PAGE_UPDATE_NOW") || "Update Now"}
            </Button>
          </div>
        )}
      </div>
    </PageDiv>
  );
}
