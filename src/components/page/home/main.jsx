// Package Imports
import { useState } from "react";
import { v7 } from "uuid";

// Lib Imports
import { endpoint } from "@/lib/endpoints";
import { log, isUuid } from "@/lib/utils";

// Context Imports
import { useWebSocketContext } from "@/components/context/websocket";
import { useEncryptionContext } from "@/components/context/encryption";
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
    let [newChatUsername, setNewChatUUID] = useState("")
    let { ownUuid, get } = useUsersContext();
    let { send } = useWebSocketContext();
    let { encrypt_base64_using_pubkey } = useEncryptionContext();
    let { privateKey } = useCryptoContext();
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
                    newChatUUID = data.data.uuid;
                    return;
                } else {
                    log(data.log.message, "showError")
                    return;
                }
            })

            if (isUuid(newChatUUID)) {
                let secret = btoa(v7() + " Tensate? " + v7() + " Sag mal Fisch " + v7() + " Jreap stinkt " + v7() + " Karpfen " + v7() + " Marmeladendoner " + v7() + " Ich war in Elias keller :^) " + v7())

            //  let ownPrivateKey;
                let ownPubKey;
                let newUserPubKey;

                let success = false;

                try {
                    await get(ownUuid).then(data => {
                        ownPubKey = data.public_key;
                    })

                    await get(newChatUUID).then(data => {
                        newUserPubKey = data.public_key;
                    })

                    success = true;
                } catch (err) {
                    success = false;
                }

                if (success) {
                    await send("shared_secret_set", {
                        message: `${ownUuid} sent ${newChatUsername} a friend request`,
                        log_level: 1
                    }, {
                        receiver_id: newChatUUID,
                        shared_secret_own: await encrypt_base64_using_pubkey(btoa(secret), ownPubKey),
                        shared_secret_other: await encrypt_base64_using_pubkey(btoa(secret), newUserPubKey),
                    })
                        .then(data => {
                            if (data.type !== "error") {
                                log(`Sent Chat Request to ${newChatUsername}`, "success")
                            }
                        })
                }
            } else {
                log("That User does not exist!", "warning")
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