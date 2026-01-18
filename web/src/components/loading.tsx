"use client";

// Package Imports
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Hourglass } from "ldrs/react";
import "ldrs/react/Hourglass.css";

// Context Imports
import { useStorageContext } from "@/context/storage";

// Components
import { MotionDivWrapper } from "@/components/animation/presence";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { progressBar } from "@/lib/utils";
import { FixedWindowControls } from "./windowControls";
import { useRouter } from "next/navigation";

// Main
function ClearButton() {
  const { clearAll } = useStorageContext();
  const router = useRouter();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Clear Storage</Button>
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
              router.refresh();
            }}
          >
            {"Clear Storage"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Loading({
  message,
  extra,
  isError: isErrorProp,
  progress,
}: {
  message?: string;
  extra?: string;
  isError?: boolean;
  progress?: number;
}) {
  const isError = isErrorProp || (message?.split("_")[0] ?? "") === "ERROR";
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
      addClearButton={showClearButton || isError}
      progress={progress}
    />
  );
}

export function RawLoading({
  message,
  extra,
  isError,
  debug,
  addClearButton,
  messageSize,
  progress,
}: {
  message: string;
  extra?: string;
  isError: boolean;
  debug: boolean;
  addClearButton?: boolean;
  messageSize?: "small";
  progress?: number;
}) {
  return (
    <>
      <FixedWindowControls />
      <div className="bg-background w-full h-screen flex flex-col justify-center items-center gap-10">
        {isError ? (
          <img
            src="/assets/images/logo.png"
            //width={75}
            //height={75}
            alt="Tensamin"
            className="w-75 h-75"
          />
        ) : (
          <div className="w-64 h-1.5 bg-secondary rounded-full overflow-hidden relative">
            <motion.div
              layoutId="loading-progress"
              className="h-full bg-primary absolute left-0 top-0"
              initial={{ width: "0%" }}
              animate={{ width: `${progress ?? 0}%` }}
              transition={{
                duration: progressBar.DELAY / 1000,
                ease: "easeInOut",
              }}
            />
          </div>
        )}
        {(isError || debug) && typeof message !== "undefined" ? (
          <p
            className={`${
              messageSize === "small" ? "text-lg" : "text-2xl"
            } font-semibold text-foreground text-center`}
          >
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

export const LOADER_NAMES = [
  "bouncy",
  "bouncy-arc",
  "cardio",
  "chaotic-orbit",
  "dot-pulse",
  "dot-stream",
  "dot-wave",
  "grid",
  "hatch",
  "helix",
  "hourglass",
  "infinity",
  "jelly",
  "jelly-triangle",
  "leapfrog",
  "line-wobble",
  "metronome",
  "mirage",
  "miyagi",
  "momentum",
  "newtons-cradle",
  "orbit",
  "ping",
  "pinwheel",
  "pulsar",
  "quantum",
  "reuleaux",
  "ring",
  "ring-2",
  "ripples",
  "square",
  "squircle",
  "superballs",
  "tail-chase",
  "treadmill",
  "trefoil",
  "trio",
  "waveform",
  "wobble",
  "zoomies",
];
export function LoadingIcon({
  invert,
  size = 17,
}: {
  invert?: boolean;
  size?: number;
}) {
  const [loader, setLoader] = useState<string>("ring");

  useEffect(() => {
    const init = async () => {
      const ldrs = await import("ldrs");
      Object.values(ldrs).forEach((l) => {
        if (l?.register) l.register();
      });

      const random =
        LOADER_NAMES[Math.floor(Math.random() * LOADER_NAMES.length)];
      setLoader(random);
    };
    init();
  }, []);

  const Tag = `l-${loader}`;

  return (
    <div
      style={{
        scale: size,
      }}
    >
      <Tag
        // @ts-expect-error stuff
        stroke={size * 3.5}
        bgOpacity="0"
        speed="2"
        color={invert ? "var(--background)" : "var(--foreground)"}
      />
    </div>
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
