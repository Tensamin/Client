"use client";

// Package Imports
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
export function Loading({
  message,
  extra,
}: {
  message?: string;
  extra?: string;
}) {
  const isError = (message?.split("_")[0] ?? "") === "ERROR";
  const { data, clearAll, translate } = useStorageContext();

  const [showClearButton, setShowClearButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowClearButton(true);
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="bg-background w-full h-screen flex flex-col justify-center items-center gap-10">
        <img
          src={
            isError ? "./assets/images/logo.png" : "./assets/images/loading.gif"
          }
          //width={75}
          //height={75}
          alt={translate("IMAGE")}
          className="w-75 h-75"
        />
        {(isError || data?.debug) && typeof message !== "undefined" ? (
          <p className="text-2xl font-semibold text-foreground text-center">
            {translate(message) || "NO_MESSAGE"}
          </p>
        ) : null}
        {(isError || data?.debug) && typeof extra !== "undefined" ? (
          <p className="text-md font-medium text-muted-foreground text-center whitespace-pre-wrap">
            {translate(extra) || "NO_MESSAGE"}
          </p>
        ) : null}
      </div>
      <div className="fixed bottom-0 right-0 m-3 flex gap-3">
        <AnimatePresence initial={false}>
          <MotionDivWrapper
            key={0}
            visible={data?.enableLockScreenBypass as boolean}
          >
            <Button variant="outline">
              {translate("RESCUE_BYPASS_BUTTON_LABEL")}
            </Button>
          </MotionDivWrapper>
          <MotionDivWrapper key={1} visible={showClearButton || isError}>
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
          </MotionDivWrapper>
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
