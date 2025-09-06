"use client";

// Package Imports
import { useEffect, useState } from "react";
import { useDencrypt } from "use-dencrypt-effect";
import * as Icon from "lucide-react";

// Lib Imports
import ls from "@/lib/local_storage";

// Components
import { Button } from "@/components/ui/button";

// Main
export function Loading({
  message = "Loading...",
  error = false,
  allowDebugToForceLoad = false,
  returnDebug,
}) {
  let [coolMessage, setCoolMessage] = useDencrypt({
    initialValue: btoa("Tensamin"),
    interval: 15,
  });
  let [debug, setDebug] = useState(false);

  useEffect(() => {
    setCoolMessage(message);
    setDebug(ls.get("debug") === "true");
  }, []);

  return (
    <div className="w-screen h-screen bg-[#11111b] flex justify-center items-center flex-col gap-20">
      <img
        src={error ? "/logo.png" : "/loading.gif"}
        alt="Tensamin"
        width={500}
        height={500}
        className="w-75 h-75 rounded-4xl select-none"
        loading="eager"
      />
      {error || debug ? (
        <p className="font-bold font-mono text-2xl text-[#c6d0f5] w-2/3 text-center">
          {debug ? message : coolMessage}
        </p>
      ) : null}
      {debug && allowDebugToForceLoad ? (
        <Button
          variant="outline"
          onClick={() => {
            returnDebug(true);
          }}
        >
          <Icon.Users /> Close (Debug Mode Only)
        </Button>
      ) : null}
    </div>
  );
}
