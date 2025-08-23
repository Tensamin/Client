"use client";

// Package Imports
import { useState, useRef, useEffect } from 'react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import * as Icon from "lucide-react";
import { v7 } from 'uuid';

// Lib Imports
import { endpoint } from '@/lib/endpoints';
import { sha256, log, isElectron } from "@/lib/utils"
import ls from '@/lib/localStorageManager';

// Context Imports
import { useEncryptionContext } from '@/components/context/encryption';

// Components
import { Card, CardContent } from "@/components/ui/card"
import { EncryptionProvider } from '@/components/context/encryption';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
};

// Wrapper
export default function EncryptionWrapper() {
  return (
    <EncryptionProvider>
      <LoginForm />
    </EncryptionProvider>
  )
};

// Main
export function LoginForm() {
  let [username, setUsername] = useState("");
  let [privateKey, setPrivateKey] = useState("");
  let [canRelease, setCanRelease] = useState(false);
  let [loading, setLoading] = useState(false);
  let [failed, setFailed] = useState(false);
  let [error, setError] = useState("");
  let { encrypt_base64_using_aes } = useEncryptionContext();
  let privateKeyFileRef = useRef(null);
  let counter = useRef(0);

  let drop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    counter.current = 0;
    setCanRelease(false);
    let dt = e.dataTransfer;
    let files = dt.files;
    handlePrivateKeyFileChange(files)
  }

  let enter = (e) => {
    e.preventDefault();
    counter.current++;
    if (counter.current === 1) setCanRelease(true);
  }

  let leave = (e) => {
    e.preventDefault();
    counter.current--;
    if (counter.current === 0) setCanRelease(false);
  }

  let over = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  async function login() {
    try {
      let uuid;
      let options;
      let verified;
      let cred_id;
      let attestation;
      let lambda;

      // Turn Username into UUID
      await fetch(endpoint.username_to_uuid + username.toLowerCase())
        .then(response => response.json())
        .then(data => {
          if (data.type === "error") {
            throw new Error(data.log.message)
          } else {
            uuid = data.data.user_id;
          }
        });

      if (isElectron()) {
        // use Keyring
        let secret = v7();
        window.keyring.set('net.methanium.tensamin', username.toLowerCase(), secret)
        let encrypted_private_key = await encrypt_base64_using_aes(btoa(JSON.stringify(privateKey)), secret)
        ls.set('auth_private_key', encrypted_private_key);
        ls.set('auth_uuid', uuid);
        window.location.href = "/";
      } else {
        // use Passkey
        await fetch(endpoint.webauthn_register_options + uuid, {
          method: "POST",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            private_key_hash: await sha256(privateKey.d)
          })
        })
          .then(response => response.json())
          .then(data => {
            if (data.type === "error") {
              throw new Error(data.log.message)
            } else {
              options = JSON.parse(atob(data.data.options));
            }
          });

        attestation = await startRegistration(options);

        await fetch(endpoint.webauthn_register_verify + uuid, {
          method: "POST",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ private_key_hash: await sha256(privateKey.d), attestation })
        })
          .then(response => response.json())
          .then(data => {
            if (data.type === "error") {
              verified = false;
              throw new Error(data.log.message)
            } else {
              lambda = data.data.lambda;
              cred_id = attestation.id;
              verified = true;
            }
          });
        if (verified) {
          let encrypted_private_key = await encrypt_base64_using_aes(btoa(JSON.stringify(privateKey)), lambda)
          ls.set('auth_private_key', encrypted_private_key);
          ls.set('auth_uuid', uuid);
          ls.set('auth_cred_id', cred_id);
          window.location.href = "/";
        } else {
          setFailed(true);
        }
      }
    } catch (err) {
      setFailed(true);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  function handleUsernameChange(event) {
    setUsername(event.target.value)
  };

  async function handlePrivateKeyFileChange(files) {
    if (files[0]) {
      let rawJwk = await readFileAsText(files[0]);

      // Pem check 
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
      setPrivateKey(jwk);
    }
  };

  function handlePrivateKeyClick() {
    privateKeyFileRef.current.click();
  };

  return (
    <div
      className="z-20 w-full h-full"
      onDrop={drop}
      onDragEnter={enter}
      onDragOver={over}
      onDragLeave={leave}
    >
      <div
        className="z-10 flex flex-col justify-center items-center w-full h-screen"
      >
        <Card className="w-auto h-auto">
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="the_real_john_doe"
                value={username}
                onChange={handleUsernameChange}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="private-key">JWK</Label>
              <div
                className="w-full h-full py-3 border border-input rounded-lg bg-input/30 hover:bg-input/50 flex"
                onClick={handlePrivateKeyClick}
              >
                <input
                  ref={privateKeyFileRef}
                  onChange={(e) => handlePrivateKeyFileChange(Array.from(e.target.files || []))}
                  className="hidden"
                  id="private-key-file"
                  type="file"
                />
                <div className="h-full w-auto flex items-center pl-3">
                  {canRelease ?
                    <Icon.FileDown size={25} strokeWidth={1.5} /> : privateKey === "" ?
                      <Icon.FileKey2 size={25} strokeWidth={1.5} /> :
                      <Icon.FileCheck size={25} strokeWidth={1.5} />
                  }
                </div>
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
              </div>
            </div>
            <Separator />
            <div className="flex flex-col gap-2 w-full">
              {failed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => {
                        if (username !== "") {
                          setFailed(false);
                          setLoading(true);
                          login();
                        }
                      }}
                    >
                      Failed
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {error}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant={loading ? "outline" : "outline"}
                  className="w-full"
                  onClick={() => {
                    if (username !== "") {
                      setLoading(true);
                      login();
                    }
                  }}
                  disabled={loading || username === ""}
                >
                  {loading ? "Loading..." : "Login"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        <br />
        <p className="text-[11px] text-muted-foreground">
          By clicking &quot;Login&quot; you agree to our
        </p>
        <p className="text-[11px] text-muted-foreground">
          <a href={endpoint.tos} className="underline">
            Terms of Service
          </a> and <a href={endpoint.pp} className="underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
};