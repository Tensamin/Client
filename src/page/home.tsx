"use client";

// Package Imports
import { useCallback, useState } from "react";
import { toast } from "sonner";
import * as Icon from "lucide-react";

// Lib Imports
import { username_to_uuid } from "@/lib/endpoints";
import { cn } from "@/lib/utils";

// Context Imports
import { useSocketContext } from "@/context/socket";
import { useUserContext } from "@/context/user";
import { useStorageContext } from "@/context/storage";

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
import {
  CardContent,
  CardDescription,
  CardHeader,
  Card,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Text } from "@/components/markdown/text";

// Main
export default function Page() {
  const { send } = useSocketContext();
  const { refetchConversations, ownUuid, appUpdateInformation } =
    useUserContext();
  const { translate } = useStorageContext();

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
      toast.error(translate("ERROR_HOME_PAGE_ADD_CONVERSATION_FAILED"));
    } finally {
      setOpen(false);
      setNewUsername("");
      setLoading(false);
    }
  }, [newUsername, refetchConversations, send, translate]);

  const [updateLoading, setUpdateLoading] = useState(false);
  const [extraInfo, setExtraInfo] = useState<string | null>(null);

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
          <Card className="bg-muted/70">
            <CardHeader>
              <CardTitle>{translate("HOME_PAGE_UPDATE_AVAILABLE")}</CardTitle>
              <CardDescription>
                {appUpdateInformation.releaseName} (
                {appUpdateInformation.version})
              </CardDescription>
              <CardAction className="flex gap-2">
                <Button
                  disabled={updateLoading}
                  size="sm"
                  className="w-[120px]"
                  onClick={() => {
                    setUpdateLoading(true);
                    // @ts-expect-error ElectronAPI only available in Electron
                    if (window.electronAPI?.doUpdate) {
                      // @ts-expect-error ElectronAPI only available in Electron
                      window.electronAPI.doUpdate().then((data) => {
                        if (data.level === "info") {
                          setUpdateLoading(false);
                          setExtraInfo(data.message);
                        }
                      });
                    }
                  }}
                >
                  {updateLoading ? (
                    <LoadingIcon invert />
                  ) : (
                    translate("HOME_PAGE_UPDATE_NOW")
                  )}
                </Button>
                <Button
                  onClick={() => {
                    // @ts-expect-error ElectronAPI only available in Electron
                    window.electronAPI?.openLink(appUpdateInformation.url);
                  }}
                  size="sm"
                >
                  <Icon.ExternalLink />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <Text
                text={appUpdateInformation.releaseNotes ?? ""}
                className="text-sm"
              />
              <div
                className={cn(
                  "overflow-hidden transition-all duration-800 ease-out",
                  extraInfo ? "max-h-24 opacity-100" : "max-h-0 opacity-80"
                )}
              >
                {extraInfo && (
                  <p className="text-sm text-destructive mt-1">{extraInfo}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageDiv>
  );
}
