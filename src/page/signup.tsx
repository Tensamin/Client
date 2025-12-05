"use client";

// Package Imports
import React, { useCallback, useEffect, useState } from "react";
import * as Icon from "lucide-react";
import { toast } from "sonner";
import "ldrs/react/Ring.css";

// Lib Imports
import { tos, pp } from "@/lib/endpoints";

// Context Imports
import { useStorageContext } from "@/context/storage";
import { usePageContext } from "@/context/page";

// Components
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { FixedWindowControls } from "@/components/windowControls";

// Main
export default function Page() {
  const [hover, setHover] = useState(false);
  const tuFileRef = React.useRef<HTMLInputElement>(null);

  const { set, debugLog, data } = useStorageContext();
  const { pageData, setPage } = usePageContext();
  debugLog("LOGIN_PAGE", "REASONE_FOR_LOGIN", pageData);

  const login = useCallback(
    async (uuid: string, privateKey: string) => {
      set("uuid", uuid);
      set("privateKey", privateKey);
      if (uuid === "" || privateKey === "") {
        toast.error("Empty Credentials Provided.");
      } else {
        //window.location.reload();
      }
    },
    [set]
  );

  useEffect(() => {
    if (
      data.privateKey === "" ||
      !data.privateKey ||
      data.uuid === "" ||
      !data.uuid
    ) {
      console.log(data.uuid);
      console.log(data.privateKey);
    } else {
      window.location.reload();
    }
  }, [data.uuid, data.privateKey]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      setHover(false);
      const files = e.target.files;
      if (!files) return;
      if (files.length === 0) return;
      const file = files[0];

      try {
        const text = await file.text();
        const splitText = text.replaceAll("\n", "").split("::");

        const uuid = splitText[0];
        const nextPrivateKey = splitText[1];

        if (!uuid || !nextPrivateKey) throw new Error();

        const buf = Buffer.from(nextPrivateKey, "base64");
        if (buf.length !== 72)
          toast.warning("Your private key has an unusual length.");
        await login(uuid, nextPrivateKey);
      } catch {
        toast.error("Invalid .tu file provided.");
      } finally {
      }
    },
    [login]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setHover(false);
      const { files } = e.dataTransfer;
      if (files.length === 0) return;
      const file = files[0];

      try {
        const text = await file.text();
        const splitText = text.replaceAll("\n", "").split("::");

        const uuid = splitText[0];
        const nextPrivateKey = splitText[1];

        if (!uuid || !nextPrivateKey) throw new Error();

        const buf = Buffer.from(nextPrivateKey, "base64");
        if (buf.length !== 72)
          toast.warning("Your private key has an unusual length.");
        await login(uuid, nextPrivateKey);
      } catch {
        toast.error("Invalid .tu file provided.");
      } finally {
      }
    },
    [login]
  );

  return (
    <>
      <FixedWindowControls />
      <div className="w-full h-screen flex items-center justify-center electron-drag">
        <div className="flex flex-col gap-5 w-full">
          <div className="flex flex-col md:flex-row w-full gap-3 px-10 justify-center">
            <Card className="w-full md:w-90 gap-3 h-80 electron-no-drag">
              <CardHeader>
                <CardTitle className="select-none">
                  Login using .tu file
                  <p className="text-xs text-muted-foreground/70 font-normal mt-2">
                    Recommended
                  </p>
                </CardTitle>
              </CardHeader>
              <CardContent className="w-full h-full">
                <input
                  hidden
                  ref={tuFileRef}
                  type="file"
                  accept=".tu"
                  onChange={handleFileSelect}
                />
                <div
                  className={`${
                    hover ? "opacity-60" : "opacity-100"
                  } transition-opacity duration-300 ease-in-out flex flex-col gap-10 items-center justify-center w-full h-full border-dashed rounded-xl cursor-pointer select-none text-sm md:py-0 py-15 ${buttonVariants(
                    { variant: "outline" }
                  )}`}
                  onClick={() => tuFileRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHover(true);
                  }}
                  onDragLeave={() => setHover(false)}
                >
                  {hover ? (
                    <Icon.FileInput
                      className="size-8"
                      strokeWidth={1.5}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setHover(true);
                      }}
                      onDragLeave={() => setHover(false)}
                    />
                  ) : (
                    <Icon.FileKey
                      className="size-8"
                      strokeWidth={1.5}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setHover(true);
                      }}
                      onDragLeave={() => setHover(false)}
                    />
                  )}
                  {hover ? "Release to login" : "Select a .tu file"}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="text-xs text-muted-foreground/75 w-full flex flex-col text-center">
            <p>By signing up you agree to our</p>
            <p>
              <a
                className="underline electron-no-drag"
                href={tos}
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>
              {" and "}
              <a
                className="underline electron-no-drag"
                href={pp}
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>
            </p>
          </div>
          <div className="flex justify-center items-center pt-15">
            <Button
              className="electron-no-drag"
              variant="outline"
              onClick={() => {
                setPage("login");
              }}
            >
              Login
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
