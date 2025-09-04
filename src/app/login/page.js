"use client";

// Package Imports
import { useState, useRef, useEffect, use } from "react";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import * as Icon from "lucide-react";
import { v7 } from "uuid";
import { Ring } from "ldrs/react";
import "ldrs/react/Ring.css";

// Lib Imports
import { endpoint } from "@/lib/endpoints";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import { sha256, isElectron } from "@/lib/utils";
import ls from "@/lib/localStorageManager";

// Context Imports
import { useEncryptionContext } from "@/components/context/encryption";

// Components
import { Card, CardContent } from "@/components/ui/card";
import { EncryptionProvider } from "@/components/context/encryption";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";

// Helper Functions
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsText(file);
  });
}

// Wrapper
export default function EncryptionWrapper() {
  return (
    <EncryptionProvider>
      <LoginForm />
    </EncryptionProvider>
  );
}

// Main
export function LoginForm() {
  let [username, setUsername] = useState("");
  let [privateKey, setPrivateKey] = useState("");
  let [canRelease, setCanRelease] = useState(false);
  let [loading, setLoading] = useState(false);
  let [failed, setFailed] = useState(false);
  let [error, setError] = useState("");
  let [staySignedIn, setStaySignedIn] = useState(false);
  let { encrypt_base64_using_aes } = useEncryptionContext();
  let privateKeyFileRef = useRef(null);
  let passwordFieldRef = useRef(null);
  let counter = useRef(0);

  let drop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    counter.current = 0;
    setCanRelease(false);
    let dt = e.dataTransfer;
    let files = dt.files;
    handlePrivateKeyFileChange(files);
  };

  let enter = (e) => {
    e.preventDefault();
    counter.current++;
    if (counter.current === 1) setCanRelease(true);
  };

  let leave = (e) => {
    e.preventDefault();
    counter.current--;
    if (counter.current === 0) setCanRelease(false);
  };

  let over = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  async function handlePrivateKeyFileChange(files) {
    if (files[0]) {
      let rawJwk = await readFileAsText(files[0]);

      // Remove in 1.0
      if (rawJwk.startsWith("-----BEGIN PRIVATE KEY-----")) {
        setFailed(true);
        setError("PEM Files are no longer supported!");
        return;
      }

      let jwk;

      try {
        jwk = JSON.parse(rawJwk);
      } catch {
        setFailed(true);
        setError("Invalid JWK!");
        return;
      }

      setFailed(false);
      setError("");

      passwordFieldRef.current.value = btoa(rawJwk);
      passwordFieldRef.current.dispatchEvent(
        new Event("change", { bubbles: true }),
      );
      passwordFieldRef.current.dispatchEvent(
        new Event("input", { bubbles: true }),
      );
      passwordFieldRef.current.focus();
      setPrivateKey(jwk);
    }
  }

  return (
    <div
      style={{ WebkitAppRegion: "drag" }}
      className="z-20 w-full h-full bg-background"
      onDrop={drop}
      onDragEnter={enter}
      onDragOver={over}
      onDragLeave={leave}
    >
      <div className="z-10 flex flex-col justify-center items-center w-full h-screen">
        <input
          ref={privateKeyFileRef}
          onChange={(e) =>
            handlePrivateKeyFileChange(Array.from(e.target.files || []))
          }
          hidden
          id="private-key-file"
          type="file"
        />
        <Card className="w-auto h-auto" style={{ WebkitAppRegion: "no-drag" }}>
          <CardContent className="flex flex-col">
            <form
              autoComplete="on"
              className="flex flex-col gap-6"
              onSubmit={async (e) => {
                e.preventDefault();

                setFailed(false);
                setLoading(true);

                try {
                  let uuid;
                  let options;
                  let verified;
                  let cred_id;
                  let attestation;
                  let lambda;

                  // Turn Username into UUID
                  await fetch(
                    endpoint.username_to_uuid + username.toLowerCase(),
                  )
                    .then((response) => response.json())
                    .then((data) => {
                      if (data.type === "error") {
                        throw new Error(data.log.message);
                      } else {
                        uuid = data.data.user_id;
                      }
                    });

                  if (isElectron()) {
                    // use Keyring
                    let secret = v7();
                    window.keyring.set(
                      "net.methanium.tensamin",
                      username.toLowerCase(),
                      secret,
                    );
                    let encrypted_private_key = await encrypt_base64_using_aes(
                      btoa(JSON.stringify(privateKey)),
                      secret,
                    );
                    ls.set("auth_private_key", encrypted_private_key);
                    ls.set("auth_uuid", uuid);
                    let url =
                      process.env.NODE_ENV === "development"
                        ? "https://ma-at-home.hackrland.dev"
                        : "app://dist/index.html";
                    window.location.href = url;
                  } else {
                    // use Passkey
                    await fetch(endpoint.webauthn_register_options + uuid, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        private_key_hash: await sha256(privateKey.d),
                      }),
                    })
                      .then((response) => response.json())
                      .then((data) => {
                        if (data.type === "error") {
                          throw new Error(data.log.message);
                        } else {
                          options = JSON.parse(atob(data.data.options));
                        }
                      });

                    attestation = await startRegistration(options);

                    await fetch(endpoint.webauthn_register_verify + uuid, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        private_key_hash: await sha256(privateKey.d),
                        attestation,
                      }),
                    })
                      .then((response) => response.json())
                      .then((data) => {
                        if (data.type === "error") {
                          verified = false;
                          throw new Error(data.log.message);
                        } else {
                          lambda = data.data.lambda;
                          cred_id = attestation.id;
                          verified = true;
                        }
                      });
                    if (verified) {
                      let encrypted_private_key =
                        await encrypt_base64_using_aes(
                          btoa(JSON.stringify(privateKey)),
                          lambda,
                        );
                      ls.set("auth_private_key", encrypted_private_key);
                      ls.set("auth_uuid", uuid);
                      ls.set("auth_cred_id", cred_id);

                      if (staySignedIn) {
                        let fingerprint = await getDeviceFingerprint();
                        let encryptedLambda = await encrypt_base64_using_aes(
                          lambda,
                          fingerprint,
                        );
                        ls.set("auth_lambda", encryptedLambda);
                      } else ls.remove("auth_lambda");
                      setLoading(true);
                      window.location.href = "/";
                    } else {
                      setFailed(true);
                      setLoading(false);
                    }
                  }
                } catch (err) {
                  setError(err.message);
                  setFailed(true);
                  setLoading(false);
                }
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  name="username"
                  autoComplete="username"
                  placeholder="cool"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="private-key">JWK</Label>
                <div className="w-full h-full flex">
                  <div className="flex gap-2">
                    <Input
                      className="w-full"
                      placeholder="base64 jwk"
                      id="password"
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      ref={passwordFieldRef}
                      onChange={() => {
                        try {
                          setPrivateKey(
                            JSON.parse(atob(passwordFieldRef.current.value)),
                          );
                        } catch {
                          setPrivateKey("");
                        }
                      }}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="h-9 w-9 flex items-center pl-3"
                          variant="outline"
                          id="select-private-key-button"
                          type="button"
                          onClick={() => privateKeyFileRef.current?.click()}
                        >
                          {canRelease ? (
                            <Icon.FileDown />
                          ) : privateKey === "" ? (
                            <Icon.FileKey2 />
                          ) : (
                            <Icon.FileCheck />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {canRelease
                          ? "Release to select"
                          : privateKey === ""
                            ? "Select your JWK"
                            : "Change your JWK"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {/*
                  <div className="h-full w-full flex flex-col items-center justify-center text-xs select-none">
                    {canRelease ? <>
                      <p>Drop it, i&apos;ll catch it!</p>
                      <p className='text-muted-foreground'>I&apos;m a good catcher</p>
                    </> : privateKey === "" ? <>
                      <p>Drag & Drop your JWK</p>
                      <p className='text-muted-foreground'>It will never leave your device.</p>
                    </> : <>
                      <p>JWK selected!</p>
                      <p className='text-muted-foreground'>You can still change it.</p>
                    </>}
                  </div>
                  */}
                </div>
                <Label
                  htmlFor="select-private-key-button"
                  className="pl-1 underline w-full text-center text-muted-foreground text-xs select-none"
                >
                  Drag & drop your .jwk file or click me to select it.
                </Label>
              </div>
              <div className="flex gap-2">
                <Checkbox
                  id="stay-signed-in"
                  checked={staySignedIn}
                  onCheckedChange={setStaySignedIn}
                />
                <Label htmlFor="stay-signed-in">Stay logged in</Label>
              </div>
              <Separator />
              <div className="flex flex-col gap-2 w-full">
                {failed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full"
                        type="submit"
                      >
                        Failed
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{error}</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    variant={loading ? "outline" : "outline"}
                    className="w-full"
                    type="submit"
                    disabled={
                      loading ||
                      username === "" ||
                      passwordFieldRef.current.value === ""
                    }
                  >
                    {loading ? (
                      <Ring
                        size="17"
                        stroke="2"
                        bgOpacity="0"
                        speed="2"
                        color="var(--foreground)"
                      />
                    ) : (
                      "Login"
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
        <br />
        <p className="text-[11px] text-muted-foreground">
          By clicking &quot;Login&quot; you agree to our
        </p>
        <p className="text-[11px] text-muted-foreground">
          <a href={endpoint.tos} className="underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href={endpoint.pp} className="underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
