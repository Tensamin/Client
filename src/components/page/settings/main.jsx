// Package Imports
import packageJson from "@/../package.json";
import { useState } from "react";
import * as Icon from "lucide-react";

// Lib Imports
import ls from "@/lib/local_storage";

// Context Imports
import { useWebSocketContext } from "@/components/context/websocket";

// Components
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import * as Page from "@/components/page/settings/pages";

// Main
let settings = [
  { name: "Profile", id: "profile", disabled: false, comp: Page.Profile },
  {
    name: "Appearance",
    id: "appearance",
    disabled: false,
    comp: Page.Appearance,
  },
  {
    name: "Notifications",
    id: "notifications",
    disabled: false,
    comp: Page.Notifications,
  },
  { name: "Voice", id: "voice", disabled: false, comp: Page.Voice },
  { name: "Premium", id: "premium", disabled: true, comp: Page.ExtraBenefits },
  { name: "Developer", id: "developer", disabled: false, comp: Page.Developer },
];

export function Main() {
  let [selected, setSelected] = useState("");
  let { iotaPing, clientPing } = useWebSocketContext();

  function select(newSelected) {
    if (selected === newSelected) {
      setSelected("");
    } else {
      setSelected(newSelected);
    }
  }

  function isSelectedClassNames(id) {
    if (selected === id) {
      return "scale-105 dark:bg-card dark:hover:bg-accent/25";
    } else {
      return "";
    }
  }

  function isSelectedTrueFalse(id) {
    if (selected === id) {
      return true;
    } else {
      return false;
    }
  }

  return (
    <div className="w-full h-full flex gap-3">
      <Card
        className={`relative p-3 w-full md:w-45 overflow-auto ${!isSelectedTrueFalse("") && "hidden md:block"}`}
      >
        <CardContent className="flex flex-col gap-2 h-full p-0">
          {settings.map((item) => (
            <Button
              disabled={item.disabled}
              variant="outline"
              key={item.id}
              onClick={() => select(item.id)}
              className={`${isSelectedClassNames(item.id)} select-none text-md md:text-sm h-11 md:h-9`}
            >
              {item.name}
            </Button>
          ))}
          <Button
            variant="destructive"
            onClick={() => {
              ls.remove("auth_uuid");
              ls.remove("auth_cred_id");
              ls.remove("auth_private_key");
              window.location.reload();
            }}
            className="select-none text-md md:text-sm h-11 md:h-9"
          >
            Logout
          </Button>
        </CardContent>
        <CardFooter className="absolute bottom-0 left-0 p-0 m-3">
          <div className="flex flex-col gap-2">
            <p className="text-foreground/50 text-xs">
              Version: {packageJson.version}
            </p>
            <p className="text-foreground/50 text-xs">
              Client Ping: {clientPing}ms
            </p>
            <p className="text-foreground/50 text-xs">
              Iota Ping: {iotaPing}ms
            </p>
          </div>
        </CardFooter>
      </Card>
      <Card
        className={`w-full h-full overflow-auto ${isSelectedTrueFalse("") && "hidden md:block"}`}
      >
        {settings.map((item) =>
          isSelectedTrueFalse(item.id) ? (
            <CardContent key={item.id} className="h-full flex flex-col">
              <div className="flex items-center">
                <Button
                  id="back-button"
                  variant="outline"
                  className="w-7 h-7 mr-1 md:hidden"
                  onClick={() => setSelected("")}
                >
                  <Icon.ArrowLeft />
                </Button>
                <Label htmlFor="back-button" className="text-xl font-bold">
                  {item.name}
                </Label>
              </div>
              <br />
              <item.comp />
            </CardContent>
          ) : null
        )}
      </Card>
    </div>
  );
}
