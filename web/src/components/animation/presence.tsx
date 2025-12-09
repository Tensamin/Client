"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { useStorageContext } from "@/context/storage";

export function MotionDivWrapper({
  children,
  className,
  fadeInFromTop,
}: {
  children: ReactNode;
  className?: string;
  fadeInFromTop?: boolean;
}) {
  const {
    data: { unfixAnimationBugToGetSquishText },
  } = useStorageContext();
  const slideOffset = fadeInFromTop
    ? "calc(100% - 3.5rem)"
    : "calc(100% + 0.75rem)";
  return (
    <motion.div
      layout={!fadeInFromTop || (unfixAnimationBugToGetSquishText as boolean)}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={{
        hidden: { [fadeInFromTop ? "y" : "x"]: slideOffset, opacity: 0 },
        visible: { [fadeInFromTop ? "y" : "x"]: 0, opacity: 1 },
        exit: { [fadeInFromTop ? "y" : "x"]: slideOffset, opacity: 0 },
      }}
      transition={{
        ...(fadeInFromTop
          ? { y: { type: "tween", duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
          : { x: { type: "tween", duration: 0.45, ease: [0.16, 1, 0.3, 1] } }),
        opacity: { duration: 0.3, ease: "easeOut" },
        layout: { type: "spring", stiffness: 400, damping: 32 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
