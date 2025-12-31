"use client";

// Package Imports
import * as Icon from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

// Lib Imports
import { username_to_id } from "@/lib/endpoints";
import { cn } from "@/lib/utils";

// Context Imports
import { useSocketContext } from "@/context/socket";
import { rawDebugLog } from "@/context/storage";
import { useUserContext } from "@/context/user";

// Components
import {
  CallInteraction,
  displayCallId,
} from "@/components/call/components/call-button";
import { LoadingIcon } from "@/components/loading";
import { Text } from "@/components/markdown/text";
import { UserModal } from "@/components/modals/user";
import { PageDiv } from "@/components/pageDiv";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { mono } from "@/lib/fonts";

// Main
export default function Page() {
  const { send } = useSocketContext();
  const { refetchConversations, appUpdateInformation, conversations } =
    useUserContext();

  const [open, setOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const addConversation = useCallback(async () => {
    setLoading(true);
    try {
      await fetch(username_to_id + newUsername)
        .then((res) => res.json())
        .then(async (data) => {
          if (data.type === "error") {
            toast.error(
              "Failed to add conversation (the user probably does not exist)"
            );
          } else {
            send("add_chat", {
              user_id: data.data.user_id,
            }).then(() => {
              refetchConversations();
            });
          }
        });
    } catch (err: unknown) {
      toast.error("Failed to add conversation");
      rawDebugLog("Homepage", "Failed to add conversation", err, "red");
    } finally {
      setOpen(false);
      setNewUsername("");
      setLoading(false);
    }
  }, [newUsername, refetchConversations, send]);

  const [updateLoading, setUpdateLoading] = useState(false);
  const [extraInfo, setExtraInfo] = useState<string | null>(null);

  return (
    <PageDiv className="p-2 flex flex-col gap-4 h-full">
      <div className="flex justify-between h-full">
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
        <ScrollArea className="flex w-auto h-[calc(100vh-300px)] flex-col">
          {conversations
            .filter((conv) => (conv.calls?.length ?? 0) > 0)
            .map((conversation, index) => (
              <div
                key={index}
                className="flex flex-col items-end gap-3 pt-3 pr-4"
              >
                {/* User */}
                <UserModal
                  id={conversation.user_id}
                  size="callOnHomepage"
                  className="order-2"
                />

                {/* Calls */}
                <div className="flex flex-col items-center justify-end gap-2">
                  {conversation.calls?.map((call, index) => (
                    <Popover key={index}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className={`h-8 text-xs ${mono.className}`}
                        >
                          {displayCallId(call)}
                          <Icon.CornerDownLeft className="ml-2 h-3 w-3 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="left" align="start">
                        <CallInteraction callId={call} onClose={() => {}} />
                      </PopoverContent>
                    </Popover>
                  ))}
                </div>
              </div>
            ))}
        </ScrollArea>
      </div>
      <ContentForTesting />
      <div className="mt-auto">
        {appUpdateInformation && (
          <Card className="bg-muted/70 border border-input">
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
                  className="w-30"
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
            {appUpdateInformation.releaseNotes &&
              appUpdateInformation.releaseNotes !== "" && (
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
                      <p className="text-sm text-destructive mt-1">
                        {extraInfo}
                      </p>
                    )}
                  </div>
                </CardContent>
              )}
          </Card>
        )}
      </div>
    </PageDiv>
  );
}

export function ContentForTesting() {
  return <div></div>;
}
