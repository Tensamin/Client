// Package Imports
import React, { useState } from "react";
import * as Icon from "lucide-react";
import { Ring } from "ldrs/react";
import { toast } from "sonner";
import "ldrs/react/Ring.css";

// Lib Imports
import { tos, pp, username_to_uuid } from "@/lib/endpoints";

// Context Imports
import { useStorageContext } from "@/context/storage";
import { usePageContext } from "@/context/page";

// Components
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";

export default function Page() {
  const [hover, setHover] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [loading, setLoading] = useState(false);

  const tuFileRef = React.useRef<HTMLInputElement>(null);

  const { set, debugLog, translate } = useStorageContext();
  const { pageData } = usePageContext();
  debugLog("LOGIN_PAGE", "REASONE_FOR_LOGIN", pageData);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    setHover(false);
    setLoading(true);
    const files = e.target.files;
    if (!files) return;
    if (files.length === 0) return;
    const file = files[0];

    try {
      const text = await file.text();
      const splitText = text.replaceAll("\n", "").split("::");

      const uuid = splitText[0];
      const privateKey = splitText[1];

      if (!uuid || !privateKey) throw new Error();

      const buf = Buffer.from(privateKey, "base64");
      if (buf.length !== 72)
        toast.warning(translate("WARN_UNUSUAL_KEY_LENGTH"));
      await login(uuid, privateKey);
    } catch {
      toast.error(translate("ERROR_INVALID_TU_FILE"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setHover(false);
    setLoading(true);
    const { files } = e.dataTransfer;
    if (files.length === 0) return;
    const file = files[0];

    try {
      const text = await file.text();
      const splitText = text.replaceAll("\n", "").split("::");

      const uuid = splitText[0];
      const privateKey = splitText[1];

      if (!uuid || !privateKey) throw new Error();

      const buf = Buffer.from(privateKey, "base64");
      if (buf.length !== 72)
        toast.warning(translate("WARN_UNUSUAL_KEY_LENGTH"));
      await login(uuid, privateKey);
    } catch {
      toast.error(translate("ERROR_INVALID_TU_FILE"));
    } finally {
      setLoading(false);
    }
  }

  async function login(uuid: string, privateKey: string) {
    set("uuid", uuid);
    set("privateKey", privateKey);
    window.location.reload();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const username = formData.get("username") as string;

    try {
      const uuidResponse = await fetch(`${username_to_uuid}${username}`);
      const uuidData = await uuidResponse.json();
      if (uuidData.type !== "success") {
        throw new Error(uuidData.log.message || "Failed to retrieve user ID.");
      }
      const uuid: string = uuidData.data.user_id;

      await login(uuid, privateKey);
    } catch (err: unknown) {
      let errorMsg = "";
      if (!err) {
        errorMsg = "Unknown error.";
      } else {
        const error = err as Error;
        errorMsg = error.message;
      }
      toast.error(translate("ERROR_LOGIN_UNKNOWN"));
    }
  }

  return (
    <div className="w-full h-screen flex items-center justify-center">
      <div className="flex flex-col gap-5 w-full sm:w-2/3 md:w-3/4 lg:w-4/6 xl:w-1/2 2xl:w-1/3">
        <div className="flex flex-col md:flex-row w-full gap-3 px-10">
          <Card className="transition-opacity duration-300 ease-in-out w-full md:w-1/2">
            <CardHeader>
              <CardTitle className="select-none">
                Login using credentials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col gap-5"
                onSubmit={handleSubmit}
                autoComplete="on"
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    required
                    id="username"
                    type="text"
                    name="username"
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Private Key</Label>
                  <Label
                    htmlFor="password"
                    className="text-xs text-muted-foreground text-left font-normal"
                  >
                    You can drag and drop a .tu file onto this page
                  </Label>
                  <Input
                    required
                    id="password"
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    disabled={loading}
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                  />
                </div>
                <Button
                  className="select-none"
                  type="submit"
                  disabled={hover || loading || !privateKey}
                >
                  {loading ? (
                    <Ring
                      size="17"
                      stroke="2"
                      bgOpacity={0}
                      speed={2}
                      color="var(--background)"
                    />
                  ) : (
                    "Login"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card className="w-full md:w-1/2">
            <CardHeader>
              <CardTitle className="select-none">
                Login using .tu file
              </CardTitle>
            </CardHeader>
            <CardContent className="w-full h-full">
              <input
                hidden
                ref={tuFileRef}
                type="file"
                accept=".tu"
                onChange={async (e) => await handleFileSelect(e)}
              />
              <div
                className={`${hover ? "opacity-50" : "opacity-100"} transition-opacity duration-300 ease-in-out flex flex-col gap-10 items-center justify-center w-full h-full border-dashed rounded-xl cursor-pointer select-none text-xs ${buttonVariants({ variant: "outline" })}`}
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
                    strokeWidth={1.2}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setHover(true);
                    }}
                    onDragLeave={() => setHover(false)}
                  />
                ) : (
                  <Icon.FileKey
                    strokeWidth={1.2}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setHover(true);
                    }}
                    onDragLeave={() => setHover(false)}
                  />
                )}
                {hover
                  ? "Release to select your .tu file"
                  : "Drag & Drop or Select the .tu file"}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="text-xs text-muted-foreground/75 w-full flex flex-col text-center">
          <p>By logging in you agree to our</p>
          <p>
            <a
              className="underline"
              href={tos}
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </a>
            {" and "}
            <a
              className="underline"
              href={pp}
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
