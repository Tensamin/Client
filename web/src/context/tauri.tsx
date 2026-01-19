"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Wrap from "@/components/Wrap";
import { useEffect, useState } from "react";
import { useStorageContext } from "./storage";
import { Button } from "@/components/ui/button";
import Avatar from "@/components/modals/Avatar";
import { useSocketContext } from "./socket";
import { toast } from "sonner";
import { useUserContext } from "./user";

export default function TauriWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isTauri, currentDeepLink } = useStorageContext();
  const { send } = useSocketContext();
  const { refetchConversations } = useUserContext();
  const [addConversationOpen, setAddConversationOpen] = useState(false);

  useEffect(() => {
    if (isTauri && currentDeepLink?.[0] === "addConversation") {
      setAddConversationOpen(true);
    }
  }, [currentDeepLink, isTauri]);

  return isTauri && currentDeepLink ? (
    <>
      <Dialog open={addConversationOpen} onOpenChange={setAddConversationOpen}>
        <p>{currentDeepLink[1]}</p>
        <Wrap
          userId={Number(currentDeepLink[1])}
          component={(user) => {
            return (
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{user.data.display}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-20 items-center w-full">
                  <div className="flex flex-col gap-5 items-center w-full">
                    <Avatar
                      image={user.data.avatar}
                      display={user.data.display}
                      size={50}
                      addBorder
                      loading={user.data.loading}
                      state={user.data.state}
                    />
                  </div>
                  <Button
                    onClick={() => {
                      send("add_conversation", {
                        chat_partner_id: user.data.id,
                      })
                        .then(() => {
                          toast.success("Conversation added successfully");
                          refetchConversations();
                        })
                        .catch(() => {
                          toast.error("Failed to add conversation");
                        });
                      setAddConversationOpen(false);
                    }}
                  >
                    Add Conversation
                  </Button>
                </div>
              </DialogContent>
            );
          }}
        />
      </Dialog>
      {children}
    </>
  ) : (
    children
  );
}
