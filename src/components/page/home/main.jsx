// Package Imports
import { useState } from "react";

// Lib Imports
import { endpoint } from "@/lib/endpoints";
import { log, isUuid } from "@/lib/utils";

// Context Imports
import { useWebSocketContext } from "@/components/context/websocket";
import { useUsersContext } from "@/components/context/users";
import { useCryptoContext } from "@/components/context/crypto";
import { useCommunityContext } from "@/components/context/communtiy";

// Components
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Main
export function Main() {
  let [open, setOpen] = useState(false);
  let [newChatUsername, setNewChatUsername] = useState("");
  let [newCommunityDomain, setNewCommunityDomain] = useState("");
  let [newCommunityTitle, setNewCommunityTitle] = useState("");
  let { send } = useWebSocketContext();
  let { doChatRefresh, doCommunityRefresh } = useUsersContext();

  async function handleSubmit() {
    try {
      let newChatUUID = "...";

      await fetch(`${endpoint.username_to_uuid}${newChatUsername}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.type !== "error") {
            newChatUUID = data.data.user_id;
            return;
          } else {
            log(data.log.message, "showError");
            return;
          }
        });

      if (isUuid(newChatUUID)) {
        await send(
          "add_chat",
          {
            message: "Adding chat",
            log_level: 1,
          },
          {
            user_id: newChatUUID,
          },
        ).then((data) => {
          if (data.type !== "error") {
            log(`Added ${newChatUsername}`, "success");
            doChatRefresh();
          }
        });
      } else {
        log("That user does not exist!", "warning");
      }
    } catch (err) {
      log(err.message, "error");
    } finally {
      setNewChatUsername("");
    }
  }

  async function handleCommunitySubmit() {
    try {
      let split = newCommunityDomain.split(":");

      let newDomain = split[0];
      let newPort = split[1] || 1984;

      send(
        "add_community",
        {
          message: "Client adding Community",
          log_level: 0,
        },
        {
          community_address: JSON.stringify([newDomain, newPort]),
          community_title: newCommunityTitle || "Community",
          position: "",
        },
      ).then(async (data) => {
        if (data.type !== "error") {
          doCommunityRefresh();
        } else {
          log(data.log.message, "error");
        }
      });
    } catch (err) {
      log(err.message, "error");
    }
  }

  return (
    <div className="w-full h-full flex gap-3">
      <Card className="w-full h-full">
        <CardHeader>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <div className="flex">
                  <button
                    role="combobox"
                    aria-expanded={open}
                    className="flex select-none"
                  >
                    <Badge>Add Chat</Badge>
                  </button>
                </div>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Enter a username</AlertDialogTitle>
                  <AlertDialogDescription>
                    <Input
                      className="text-foreground"
                      placeholder="some_user"
                      value={newChatUsername}
                      onChange={(e) => setNewChatUsername(e.target.value)}
                      onSubmit={handleSubmit}
                    ></Input>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>
                    Add
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <div className="flex">
                  <button
                    role="combobox"
                    aria-expanded={open}
                    className="flex select-none"
                  >
                    <Badge>Add Community</Badge>
                  </button>
                </div>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Enter a domain</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="new-community-domain">Domain</Label>
                        <Input
                          id="new-community-domain"
                          className="text-foreground"
                          placeholder="methanium.net"
                          value={newCommunityDomain}
                          onChange={(e) =>
                            setNewCommunityDomain(e.target.value)
                          }
                          onSubmit={handleCommunitySubmit}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="new-community-title">Title</Label>
                        <Input
                          id="new-community-title"
                          className="text-foreground"
                          placeholder="Community"
                          value={newCommunityTitle}
                          onChange={(e) => setNewCommunityTitle(e.target.value)}
                          onSubmit={handleCommunitySubmit}
                        />
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCommunitySubmit}>
                    Add
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="h-full w-full">
          <p>Homepage (Temp)</p>
        </CardContent>
      </Card>
      <Card className="w-70"></Card>
    </div>
  );
}
