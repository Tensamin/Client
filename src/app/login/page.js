"use client";

// Package Imports
import { useState, useRef } from 'react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import * as Icon from "lucide-react";

// Lib Imports
import { endpoint } from '@/lib/endpoints';
import { sha256, log } from "@/lib/utils"
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
  let { encrypt_base64_using_aes } = useEncryptionContext();
  let privateKeyFileRef = useRef(null);

  async function login(useExistingPasskey) {
    try {
      let uuid;
      let options;
      let verified;
      let cred_id;
      let attestation;
      let lambda;

      await fetch(endpoint.username_to_uuid + username)
        .then(response => response.json())
        .then(data => {
          if (data.type === "error") {
            throw new Error(data.log.message)
          } else {
            uuid = data.data.uuid;
          }
        });

      if (useExistingPasskey) {
        cred_id = prompt("Enter the cred id found in the database or on the existing device:")
        await fetch(`${endpoint.webauthn_login_options}${uuid}/${cred_id}`)
          .then(response => response.json())
          .then(data => {
            if (data.type === "error") {
              throw new Error(data.log.message)
            } else {
              options = JSON.parse(atob(data.data.options));
            }
          });
      } else {
        await fetch(endpoint.webauthn_register_options + uuid, {
          method: "POST",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            private_key_hash: await sha256(privateKey)
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
      }

      if (useExistingPasskey) {
        attestation = await startAuthentication(options);
      } else {
        attestation = await startRegistration(options);
      }

      await fetch(useExistingPasskey ? `${endpoint.webauthn_login_verify}${uuid}/${cred_id}` : endpoint.webauthn_register_verify + uuid, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: useExistingPasskey ? JSON.stringify({ attestation }) : JSON.stringify({ private_key_hash: await sha256(privateKey), attestation })
      })
        .then(response => response.json())
        .then(data => {
          if (data.type === "error") {
            verified = false;
            throw new Error(data.log.message)
          } else {
            lambda = data.data.lambda;
            if (!useExistingPasskey) cred_id = data.data.cred_id;
            verified = true;
          }
        });

      if (verified) {
        let encrypted_private_key = await encrypt_base64_using_aes(privateKey, lambda)
        ls.set('auth_private_key', encrypted_private_key);
        ls.set('auth_uuid', uuid);
        ls.set('auth_cred_id', cred_id);
        window.location.href = "/";
      }
    } catch (err) {
      log(err.message, "showError")
    }
  }

  function handleUsernameChange(event) {
    setUsername(event.target.value.toLowerCase())
  }

  async function handlePrivateKeyFileChange(files) {
    if (files[0]) {
      let pemPrivateKey = await readFileAsText(files[0])
      if (pemPrivateKey.startsWith("-----BEGIN PRIVATE KEY-----\n")) {
        pemPrivateKey = pemPrivateKey.replaceAll("-----BEGIN PRIVATE KEY-----\n", "").replaceAll("\n-----END PRIVATE KEY-----", "")
      }
      setPrivateKey(pemPrivateKey);
    }
  }

  function handlePrivateKeyClick() {
    privateKeyFileRef.current.click();
  }

  return (
    <div
      className="flex flex-col justify-center items-center w-full h-screen"
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        let dt = e.dataTransfer;
        let files = dt.files;
        handlePrivateKeyFileChange(files)
      }}
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
            <Label htmlFor="private-key">Private Key</Label>
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
                {privateKey === "" ? <Icon.FileKey size={30} strokeWidth={1} />
                  : <Icon.FileCheck size={30} strokeWidth={1} />}
              </div>
              <div className="h-full w-full flex flex-col items-center justify-center text-xs select-none">
                {privateKey === "" ? <>
                  <p>Drag & Drop your private key</p>
                  <p className='text-muted-foreground'>It will never leave your device.</p>
                </> : <>
                  <p>Private key selected!</p>
                  <p className='text-muted-foreground'>You can still change it.</p>
                </>}
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex flex-col gap-2 w-full">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                login(false)
              }}
            >
              Add Device
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                login(true)
              }}
            >
              Add Device with existing passkey
            </Button>
            <p className="text-[11px] text-muted-foreground">
              By clicking &quot;Add device&quot; or &quot;Add Device with existing passkey&quot;
            </p>
          </div>
        </CardContent>
      </Card>
      <br />
      <p className="text-[11px] text-muted-foreground">
        you agree to our <a href={endpoint.tos} className="underline">
          Terms of Service
        </a> and <a href={endpoint.pp} className="underline">Privacy Policy.</a>
      </p>
    </div>
  )
};