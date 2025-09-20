// Package Imports
import React, { useState } from "react";
import { toast } from "sonner";
import { startRegistration } from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
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

// Components
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
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

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setHover(false);
    const { files } = e.dataTransfer;
    if (files.length === 0) return;
    const file = files[0];

    try {
      const text = await file.text();
      const rawJwk = JSON.parse(text);
      if (typeof rawJwk.d !== "string") throw new Error("Missing 'd' key.");
      const buf = Buffer.from(rawJwk.d, "base64");
      if (buf.length !== 72) throw new Error("Invalid JWK length.");
      setBase64Jwk(rawJwk.d);
      toast.success("Valid JWK file loaded.");
    } catch {
      toast.error("Invalid or corrupted JWK file.");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const username = formData.get("username") as string;

    try {
      try {
        const cred = await navigator.credentials.create({
          // @ts-expect-error Password currently not in CredentialCreationOptions
          password: e.target,
        });
        if (cred) {
          await navigator.credentials.store(cred);
        }
      } catch {}

      const uuidResponse = await fetch(`${username_to_uuid}${username}`);
      const uuidData = await uuidResponse.json();
      if (uuidData.type !== "success") {
        throw new Error(uuidData.log.message || "Failed to retrieve user ID.");
      }
      const uuid: string = uuidData.data.user_id;

      if (isElectron()) {
        const secret = v7();
        // @ts-expect-error Keyring is only available in Electron
        window.keyring.set("net.methanium.tensamin", uuid, secret);

        const encryptedJwk = await encrypt(base64Jwk, secret);
        if (!encryptedJwk.success) {
          throw new Error(encryptedJwk.message || "JWK encryption failed.");
        }
        localStorage.setItem("auth_private_key", encryptedJwk.message);
        localStorage.setItem("auth_uuid", uuid);

        window.location.href =
          process.env.NODE_ENV === "development"
            ? "https://ma-at-home.hackrland.dev"
            : "app://dist/index.html";
      } else {
        const privateKeyHash = await sha256(base64Jwk);

        const optionsResponse = await fetch(webauthn_register_options + uuid, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ private_key_hash: privateKeyHash }),
        });
        const optionsData = await optionsResponse.json();
        if (optionsData.type !== "success") {
          throw new Error(
            optionsData.log.message || "Failed to get registration options."
          );
        }
        const options: PublicKeyCredentialCreationOptionsJSON = JSON.parse(
          atob(optionsData.data.options)
        );

        const attestation: RegistrationResponseJSON = await startRegistration({
          optionsJSON: options,
        });

        const verifyResponse = await fetch(webauthn_register_verify + uuid, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            private_key_hash: privateKeyHash,
            attestation,
          }),
        });
        const verifyData = await verifyResponse.json();
        if (verifyData.type !== "success") {
          throw new Error(verifyData.log.message || "Verification failed.");
        }

        const lambda: string = verifyData.data.lambda;
        const cred_id: string = attestation.id;

        const encryptedJwk = await encrypt(base64Jwk, lambda);
        if (!encryptedJwk.success) {
          throw new Error(encryptedJwk.message || "JWK encryption failed.");
        }
        localStorage.setItem("auth_private_key", encryptedJwk.message);
        localStorage.setItem("auth_uuid", uuid);
        localStorage.setItem("auth_cred_id", cred_id);

        if (stayLoggedIn) {
          const fingerprint = await getDeviceFingerprint();
          const encryptedLambda = await encrypt(lambda, fingerprint);
          if (!encryptedLambda.success) {
            throw new Error(
              encryptedLambda.message || "Failed to encrypt session key."
            );
          }
          localStorage.setItem("auth_lambda", encryptedLambda.message);
        } else {
          localStorage.removeItem("auth_lambda");
        }
        window.location.reload();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log("error", "LOGIN", "ERROR_LOGIN_UNKNOWN", errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
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
                <Label htmlFor="password">Base64 JWK</Label>
                <Label
                  htmlFor="password"
                  className="text-xs text-muted-foreground text-left font-normal"
                >
                  You can drag and drop a .jwk file onto this page
                </Label>
                <Input
                  required
                  id="password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  disabled={hover || loading}
                  value={base64Jwk}
                  onChange={(e) => setBase64Jwk(e.target.value)}
                />
              </div>
              <div className="flex gap-2 items-center">
                <Checkbox
                  id="stayLoggedIn"
                  disabled={hover || loading}
                  checked={stayLoggedIn}
                  onCheckedChange={(value) => setStayLoggedIn(value as boolean)}
                />
                <Label htmlFor="stayLoggedIn" className="!mt-0">
                  Stay logged in?
                </Label>
              </div>
              <Button type="submit" disabled={hover || loading || !base64Jwk}>
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
