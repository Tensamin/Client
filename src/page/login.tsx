// Package Imports
import React, { useState, useRef } from "react";
import { toast } from "sonner";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import * as Icon from "lucide-react";
import { v7 } from "uuid";
import { Ring } from "ldrs/react";
import "ldrs/react/Ring.css";

// Lib Imports
import {
  tos,
  pp,
  username_to_uuid,
  webauthn_register_options,
  webauthn_register_verify,
} from "@/lib/endpoints";
import { log, isElectron, sha256 } from "@/lib/utils";
import { getDeviceFingerprint } from "@/lib/fingerprint";

// Context Imports
import { useCryptoContext } from "@/context/crypto";
import { usePageContext } from "@/app/page";

// Components
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export default function Page() {
  const [hover, setHover] = useState(false);
  const [base64Jwk, setBase64Jwk] = useState("");

  const [loading, setLoading] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);

  const { encrypt } = useCryptoContext();

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    const file = files[0];
    const text = await file.text();
    setHover(false);
    let jwk;
    try {
      const rawJwk = JSON.parse(text);
      jwk = rawJwk.d;
      const buf = Buffer.from(jwk, "base64");
      if (buf.length !== 72) throw new Error();
      setBase64Jwk(jwk);
      toast.success("Valid JWK file");
    } catch {
      toast.error("Invalid JWK file");
      return;
    }
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    try {
      try {
        const cred = await (navigator.credentials as any).create({
          password: e.target,
        });
        if (cred) {
          await (navigator.credentials as any).store(cred);
        }
      } catch {}
      const username = e.target.username.value;

      let uuid: string = "";
      let options: any;
      let attestation: any;
      let verified: boolean = false;
      let lambda: string = "";
      let cred_id: string = "";

      await fetch(username_to_uuid + username)
        .then((response) => response.json())
        .then((data) => {
          if (data.type === "success") {
            uuid = data.data.user_id;
          } else {
            log("error", "LOGIN", data.log.message);
          }
        })
        .catch((err) => {
          log("error", "LOGIN", "ERROR_LOGIN_GET_UUID_UNKOWN", err.message);
        });

      if (isElectron()) {
        // use Keyring
        let secret = v7();
        (window as any).keyring.set("net.methanium.tensamin", uuid, secret);
        const encryptedJwk = await encrypt(base64Jwk, secret);
        if (!encryptedJwk.success) log("error", "LOGIN", encryptedJwk.message);
        localStorage.setItem("auth_private_key", encryptedJwk.message);
        localStorage.setItem("auth_uuid", uuid);
        window.location.href =
          process.env.NODE_ENV === "development"
            ? "https://ma-at-home.hackrland.dev"
            : "app://dist/index.html";
      } else {
        // use Passkey
        await fetch(webauthn_register_options + uuid, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            private_key_hash: await sha256(base64Jwk),
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

        await fetch(webauthn_register_verify + uuid, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            private_key_hash: await sha256(base64Jwk),
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
          const encryptedJwk = await encrypt(base64Jwk, lambda);
          if (!encryptedJwk.success)
            log("error", "LOGIN", encryptedJwk.message);
          localStorage.setItem("auth_private_key", encryptedJwk.message);
          localStorage.setItem("auth_uuid", uuid);
          localStorage.setItem("auth_cred_id", cred_id);

          if (stayLoggedIn) {
            const fingerprint = await getDeviceFingerprint();
            const encryptedLambda = await encrypt(lambda, fingerprint);
            if (!encryptedLambda.success)
              log("error", "LOGIN", encryptedLambda.message);
            localStorage.setItem("auth_lambda", encryptedLambda.message);
          } else localStorage.removeItem("auth_lambda");
          window.location.reload();
        } else {
          setLoading(false);
        }
      }
    } catch (err: any) {
      log("error", "LOGIN", "ERROR_LOGIN_UNKNOWN", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="w-full h-screen flex items-center justify-center"
      onDrop={handleDrop}
      onDragOver={(e: React.DragEvent) => {
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
                  disabled={hover}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Base64 JWK</Label>
                <Label
                  htmlFor="password"
                  className="text-xs text-muted-foreground text-left font-normal"
                >
                  You can drag and drop jwk files into this page
                </Label>
                <Input
                  required
                  id="password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  disabled={hover}
                  value={base64Jwk}
                  onChange={(e: any) => setBase64Jwk(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Checkbox
                  id="stayLoggedIn"
                  disabled={hover}
                  checked={stayLoggedIn}
                  onCheckedChange={(value) => setStayLoggedIn(value as boolean)}
                />
                <Label htmlFor="stayLoggedIn">Stay logged in?</Label>
              </div>
              <Button type="submit" disabled={hover}>
                {loading ? (
                  <Ring
                    size="17"
                    stroke="2"
                    bgOpacity="0"
                    speed="2"
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
            <a className="underline" href={tos} target="_blank">
              Terms of Service
            </a>
            {`\nand\n`}
            <a className="underline" href={pp} target="_blank">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
