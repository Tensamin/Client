"use client";

import { AnimatePresence, motion } from "framer-motion";

import MotionDivWrapper from "@/components/animation/Presence";
import { progressBar } from "@/lib/utils";
import FixedWindowControls from "@/components/WindowControls";
import ClearStorageButton from "./ClearStorageButton";

interface RawLoadingProps {
  message: string;
  extra?: string;
  isError: boolean;
  debug: boolean;
  addClearButton?: boolean;
  messageSize?: "small";
  progress?: number;
}

export default function RawLoading({
  message,
  extra,
  isError,
  debug,
  addClearButton,
  messageSize,
  progress,
}: RawLoadingProps) {
  return (
    <>
      <FixedWindowControls />
      <div className="bg-background w-full h-screen flex flex-col justify-center items-center gap-10">
        {isError ? (
          <img
            src="/assets/images/logo.png"
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
              <ClearStorageButton />
            </MotionDivWrapper>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
