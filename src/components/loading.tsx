"use client";

// Package Imports
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Ring } from "ldrs/react";
import "ldrs/react/Ring.css";

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

// Main
function ClearButton() {
  const { translate, clearAll } = useStorageContext();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          {translate("RESCUE_CLEAR_STORAGE_BUTTON_LABEL")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {translate("RESCUE_CLEAR_STORAGE_BUTTON_LABEL")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {translate("RESCUE_CLEAR_STORAGE_BUTTON_DESCRIPTION")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <div className="w-full" />
          <AlertDialogCancel>{translate("CANCEL")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              clearAll();
              window.location.reload();
            }}
          >
            {translate("RESCUE_CLEAR_STORAGE_BUTTON_LABEL")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function BypassButton() {
  const { setBypass, bypass, translate } = useStorageContext();
  return (
    <Button variant="outline" onClick={() => setBypass(true)} disabled={bypass}>
      {translate("RESCUE_BYPASS_BUTTON_LABEL")}
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
  const { data, translate } = useStorageContext();

  const [showClearButton, setShowClearButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowClearButton(true);
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <RawLoading
      message={translate(message as string) || "NO_MESSAGE"}
      extra={translate(extra as string) || ""}
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
}: {
  message: string;
  extra?: string;
  isError: boolean;
  debug: boolean;
  addClearButton?: boolean;
  addBypassButton?: boolean;
}) {
  return (
    <>
      <div className="bg-background w-full h-screen flex flex-col justify-center items-center gap-10">
        <img
          src={
            isError ? "./assets/images/logo.png" : "./assets/images/loading.gif"
          }
          //width={75}
          //height={75}
          alt="Tensamin"
          className="w-75 h-75"
        />
        {(isError || debug) && typeof message !== "undefined" ? (
          <p className="text-2xl font-semibold text-foreground text-center">
            {message}
          </p>
        ) : null}
        {(isError || debug) && typeof extra !== "undefined" ? (
          <p className="text-md font-medium text-muted-foreground text-center whitespace-pre-wrap">
            {extra}
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
