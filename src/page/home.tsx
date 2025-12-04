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
  const { debugLog } = useStorageContext();

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
            toast.error(
              "Failed to add conversation (the user probably does not exist)"
            );
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
      toast.error("Failed to add conversation");
      debugLog("HOME_PAGE", "ADD_CONVERSATION_ERROR", err);
    } finally {
      setOpen(false);
      setNewUsername("");
      setLoading(false);
    }
  }, [newUsername, refetchConversations, send, debugLog]);

  const [updateLoading, setUpdateLoading] = useState(false);
  const [extraInfo, setExtraInfo] = useState<string | null>(null);

  return (
    <PageDiv className="flex flex-col gap-4 h-full">
      <div className="flex gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Add Conversation</Button>
          </DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Add Conversation</DialogTitle>
              <DialogDescription>
                Create a new conversation with a user by entering their
                username.
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
                  placeholder="Enter a username..."
                  className="w-full"
                />
                <div className="flex gap-2">
                  <div className="w-full" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={addConversation}
                    disabled={!newUsername || loading}
                  >
                    {loading ? <LoadingIcon invert /> : "Add"}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button size="sm" disabled>
          Add Community
        </Button>
      </div>
      <UserModal size="profile" uuid={ownUuid} />
      <ContentForTesting />
      <div className="mt-auto">
        {appUpdateInformation && (
          <Card className="bg-muted/70">
            <CardHeader>
              <CardTitle>Update Available</CardTitle>
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
                      window.electronAPI
                        .doUpdate()
                        .then((data: { message: string }) => {
                          setUpdateLoading(false);
                          setExtraInfo(data.message);
                        })
                        .catch(() => {
                          setUpdateLoading(false);
                        });
                    }
                  }}
                >
                  {updateLoading ? <LoadingIcon invert /> : "Update Now"}
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

export function ContentForTesting() {
  return <div>🗣️ TOOOOOOOOOM</div>;
}
