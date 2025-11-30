"use client";

// Package Imports
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import * as Icon from "lucide-react";
import { Ring, Hourglass } from "ldrs/react";
import "ldrs/react/Ring.css";
import "ldrs/react/Hourglass.css";

// Context Imports
import { useStorageContext } from "@/context/storage";

// Components
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { MotionDivWrapper } from "@/components/animation/presence";
import { errorMessageToInfo } from "@/lib/utils";

// Main
function ClearButton() {
  const { clearAll } = useStorageContext();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">{"Clear Storage"}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{"Clear Storage"}</AlertDialogTitle>
          <AlertDialogDescription>
            {
              "This will clear all your settings and log you out of your account."
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <div className="w-full" />
          <AlertDialogCancel>{"Cancel"}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              clearAll();
              window.location.reload();
            }}
          >
            {"Clear Storage"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function BypassButton() {
  const { setBypass, bypass } = useStorageContext();
  return (
    <Button variant="outline" onClick={() => setBypass(true)} disabled={bypass}>
      {"Bypass Screen"}
    </Button>
  );
}

export function Loading({
  message,
  extra,
}: {
  message?: string;
  extra?: string;
}) {
  const isError = (message?.split("_")[0] ?? "") === "ERROR";
  const { data } = useStorageContext();

  const [showClearButton, setShowClearButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowClearButton(true);
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <RawLoading
      message={message || "No Message"}
      extra={extra || ""}
      isError={isError}
      debug={(data?.debug as boolean) || false}
      addBypassButton={(data?.enableLockScreenBypass as boolean) || false}
      addClearButton={showClearButton || isError}
    />
  );
}

export function RawLoading({
  message,
  extra,
  isError,
  debug,
  addClearButton,
  addBypassButton,
  messageSize,
}: {
  message: string;
  extra?: string;
  isError: boolean;
  debug: boolean;
  addClearButton?: boolean;
  addBypassButton?: boolean;
  messageSize?: "small";
}) {
  return (
    <>
      <div className="bg-background w-full h-screen flex flex-col justify-center items-center gap-10">
        {isError ? (
          // eslint-disable-next-line
          <img
            src="/assets/images/logo.png"
            //width={75}
            //height={75}
            alt="Tensamin"
            className="w-75 h-75"
          />
        ) : (
          <Icon.Loader
            role="status"
            aria-label="Loading"
            className="size-14 animate-spin text-foreground"
          />
        )}
        {(isError || debug) && typeof message !== "undefined" ? (
          <p
            className={`${
              messageSize === "small" ? "text-lg" : "text-2xl"
            } font-semibold text-foreground text-center`}
          >
            {errorMessageToInfo(message)}
          </p>
        ) : null}
        {(isError || debug) && typeof extra !== "undefined" ? (
          <p className="text-md font-medium text-muted-foreground text-center whitespace-pre-wrap">
            {errorMessageToInfo(extra)}
          </p>
        ) : null}
      </div>
      <div className="fixed bottom-0 right-0 m-3 flex gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {addBypassButton ? (
            <MotionDivWrapper key="bypass">
              <BypassButton />
            </MotionDivWrapper>
          ) : null}
          {addClearButton ? (
            <MotionDivWrapper key="clear">
              <ClearButton />
            </MotionDivWrapper>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}

export function LoadingIcon({ invert }: { invert?: boolean }) {
  return (
    <Ring
      size="17"
      stroke="2"
      bgOpacity="0"
      speed="2"
      color={invert ? "var(--background)" : "var(--foreground)"}
    />
  );
}

export function DelayedLoadingIcon({ invert }: { invert?: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {show && (
        <MotionDivWrapper fadeInFromTop>
          <Hourglass
            size="40"
            bgOpacity="0.25"
            speed="2"
            color={invert ? "var(--background)" : "var(--foreground)"}
          />
        </MotionDivWrapper>
      )}
    </AnimatePresence>
  );
}
