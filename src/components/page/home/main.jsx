// Package Imports
import { useState } from "react";

// Lib Imports
import { endpoint } from "@/lib/endpoints";
import { log, isUuid } from "@/lib/utils";

// Context Imports
import { useWebSocketContext } from "@/components/context/websocket";
import { useUsersContext } from "@/components/context/users";
import { useCryptoContext } from "@/components/context/crypto";

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
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

// Main
export function Main() {
    let [open, setOpen] = useState(false)
    let [newChatUsername, setNewChatUUID] = useState("");
    let [newCommunityDomain, setNewCommunityDomain] = useState("");
    let { send } = useWebSocketContext();

    function handleInputChange(e) {
        setNewChatUUID(e)
    }

    async function handleSubmit() {
        try {
            let newChatUUID = "...";

            await fetch(`${endpoint.username_to_uuid}${newChatUsername}`)
                .then(response => response.json())
                .then(data => {
                    if (data.type !== "error") {
                        newChatUUID = data.data.user_id;
                        return;
                    } else {
                        log(data.log.message, "showError")
                        return;
                    }
                })

            if (isUuid(newChatUUID)) {
                await send("add_chat", {
                    message: "Adding chat",
                    log_level: 1
                }, {
                    user_id: newChatUUID,
                })
                    .then(data => {
                        if (data.type !== "error") {
                            log(`Added ${newChatUsername}`, "success")
                        }
                    })
            } else {
                log("That user does not exist!", "warning")
            }
        } catch (err) {
            log(err.message, "error")
        } finally {
            setNewChatUUID("")
        }
    }

    function handleCommunityInputChange(e) {
        setNewCommunityDomain(e)
    }

    async function handleCommunitySubmit() {
        try {
            let newPort = 0;
            let newIP = "0.0.0.0";

            let split = newCommunityDomain.split(":");
            newIP = split[0];
            newPort = split[1] || 1984;

            return;
            await fetch(`${endpoint.username_to_uuid}${newChatUsername}`)
                .then(response => response.json())
                .then(data => {
                    if (data.type !== "error") {
                        newChatUUID = data.data.user_id;
                        return;
                    } else {
                        log(data.log.message, "showError")
                        return;
                    }
                })

            if (isUuid(newChatUUID)) {
                await send("add_chat", {
                    message: "Adding chat",
                    log_level: 1
                }, {
                    user_id: newChatUUID,
                })
                    .then(data => {
                        if (data.type !== "error") {
                            log(`Added ${newChatUsername}`, "success")
                        }
                    })
            } else {
                log("That user does not exist!", "warning")
            }
        } catch (err) {
            log(err.message, "error")
        } finally {
            setNewChatUUID("")
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
                                        className="flex"
                                    >
                                        <Badge>
                                            Add Chat
                                        </Badge>
                                    </button>
                                </div>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Enter a username</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        <Input placeholder="the_real_john_doe" value={newChatUsername} onChange={(e) => handleInputChange(e.target.value)} onSubmit={handleSubmit}></Input>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleSubmit}>Add</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <div className="flex">
                                    <button
                                        role="combobox"
                                        aria-expanded={open}
                                        className="flex"
                                    >
                                        <Badge>
                                            Add Community
                                        </Badge>
                                    </button>
                                </div>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Enter a domain</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        <Input placeholder="methanium.net" value={newCommunityDomain} onChange={(e) => handleCommunityInputChange(e.target.value)} onSubmit={handleCommunitySubmit}></Input>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleCommunitySubmit}>Add</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardHeader>
                <CardContent className="h-full w-full">
                    <p>Homepage (Temp)</p>
                </CardContent>
            </Card>
            <Card className="w-70">

            </Card>
        </div>
    )
}