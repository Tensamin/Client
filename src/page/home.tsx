"use client";

// Package Imports
import { useState } from "react";

// Lib Imports
import { username_to_uuid } from "@/lib/endpoints";
import { handleError, log } from "@/lib/utils";

// Context Imports
import { useSocketContext } from "@/context/socket";
import { useUserContext } from "@/context/user";

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
import { AdvancedSuccessMessage } from "@/lib/types";
import { LoadingIcon } from "@/components/loading";
import { PageDiv } from "@/components/pageDiv";

// Main
export default function Page() {
  const { send } = useSocketContext();
  const { refetchConversations } = useUserContext();

  const [open, setOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [loading, setLoading] = useState(false);

  async function addConversation() {
    setLoading(true);
    try {
      await fetch(username_to_uuid + newUsername)
        .then((res) => res.json())
        .then(async (data: AdvancedSuccessMessage) => {
          if (data.type === "error") {
            log(
              "error",
              "CONVERSATION",
              "ADD_CONVERSATION_FAILED",
              data.log.message
            );
          } else {
            await send(
              "add_chat",
              {
                log_level: 0,
                message: "ADD_CONVERSATION",
              },
              {
                user_id: data.data.user_id,
              }
            ).then(async (data: AdvancedSuccessMessage | unknown) => {
              if (!data) return;
              const typedData = data as AdvancedSuccessMessage;
              if (typedData.type !== "error") {
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
  }

  return (
    <PageDiv className="flex flex-col gap-4 h-full">
      <div className="flex gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Add Conversation</Button>
          </DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Add Friend</DialogTitle>
              <DialogDescription>
                This will send a friend request to the user.
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
                  placeholder="Type a username"
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
                    {loading ? <LoadingIcon invert /> : "Add Conversation"}
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
      <p>Homepage :)</p>
    </PageDiv>
  );
}
