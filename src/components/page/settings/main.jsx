// Package Imports
import packageJson from "@/../package.json"
import { useState } from "react"

// Context Imports
import { useWebSocketContext } from "@/components/context/websocket"

// Components
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import * as Page from "@/components/page/settings/pages"

// Main
let settings = [
    { name: "Profile", id: "profile", disabled: false, comp: Page.Profile },
    { name: "Appearance", id: "appearance", disabled: false, comp: Page.Appearance },
    { name: "Notifications", id: "notifications", disabled: false, comp: Page.Notifications },
    { name: "Voice", id: "voice", disabled: false, comp: Page.Voice },
    { name: "Premium", id: "premium", disabled: true, comp: Page.ExtraBenefits },
    { name: "Mods", id: "mods", disabled: false, comp: Page.Mods },

    { name: "Developer", id: "developer", disabled: false, comp: Page.Developer }
]

export function Main() {
    let [selected, setSelected] = useState("")
    let { iotaPing, clientPing } = useWebSocketContext()

    function select(newSelected) {
        if (selected === newSelected) {
            setSelected("")
        } else {
            setSelected(newSelected)
        }
    }

    function isSelectedClassNames(id) {
        if (selected === id) {
            return "scale-105 dark:bg-card dark:hover:bg-accent/25";
        } else {
            return "";
        };
    };

    function isSelectedTrueFalse(id) {
        if (selected === id) {
            return true;
        } else {
            return false;
        };
    };

    return (
        <div className="w-full h-full flex gap-3">
            <Card className="p-3 w-45 overflow-auto">
                <CardContent className="flex flex-col gap-2 h-full p-0">
                    {settings.map((item) => (
                        <Button
                            disabled={item.disabled}
                            variant="outline"
                            key={item.id}
                            onClick={() => select(item.id)}
                            className={isSelectedClassNames(item.id)}
                        >{item.name}</Button>
                    ))}
                </CardContent>
                <CardFooter className="p-0">
                    <div className="flex flex-col gap-2">
                        <p className="text-foreground/50 text-xs">Version: {packageJson.version}</p>
                        <p className="text-foreground/50 text-xs">Client Ping: {clientPing}ms</p>
                        <p className="text-foreground/50 text-xs">Iota Ping: {iotaPing}ms</p>
                    </div>
                </CardFooter>
            </Card>
            <Card className="w-full h-full overflow-auto">
                {settings.map((item) => (
                    isSelectedTrueFalse(item.id) ? (
                        <CardContent key={item.id} className="h-full flex flex-col">
                            <p className="text-xl font-bold">{item.name}</p>
                            <br />
                            <item.comp />
                        </CardContent>
                    ) : null
                ))}
            </Card>
        </div>
    )
}