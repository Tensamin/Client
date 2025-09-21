// Package Imports
import React, { useState } from "react";
import { Ring } from "ldrs/react";
import "ldrs/react/Ring.css";

// Lib Imports
import { tos, pp, username_to_uuid } from "@/lib/endpoints";
import { log } from "@/lib/utils";

// Context Imports
import { useStorageContext } from "@/context/storage";

// Components
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function Page() {
  const [hover, setHover] = useState(false);
  const [privateKey, setPrivateKey] = useState("");

  const [loading, setLoading] = useState(false);

  const { set } = useStorageContext();

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
      if (buf.length !== 72) log("warn", "LOGIN", "WARN_UNUSUAL_KEY_LENGTH");
      await login(uuid, privateKey);
    } catch {
      log("error", "LOGIN", "ERROR_INVALID_TU_FILE");
    }
  }

  async function login(uuid: string, privateKey: string) {
    try {
      set("uuid", uuid);
      set("privateKey", privateKey);
      window.location.reload();
    } catch {
      log("error", "LOGIN", "ERROR_LOGIN_UNKNOWN");
    } finally {
      setLoading(false);
    }
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
      log("error", "LOGIN", "ERROR_LOGIN_UNKNOWN", errorMsg);
    }
  }

  return (
    <div
      className="w-full h-screen flex items-center justify-center"
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
    >
      <div className="flex flex-col gap-5">
        <Card
          className={`${hover ? "opacity-50" : "opacity-100"} transition-opacity duration-300 ease-in-out`}
        >
          <CardHeader>
            <CardTitle>Login</CardTitle>
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
                  disabled={hover || loading}
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
                  disabled={hover || loading}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={hover || loading || !privateKey}>
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
