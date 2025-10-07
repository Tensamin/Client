"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

const slideOffset = "calc(100% + 0.75rem)";

const slideVariants = {
  hidden: { x: slideOffset, opacity: 0 },
  visible: { x: 0, opacity: 1 },
  exit: { x: slideOffset, opacity: 0 },
};

export function MotionDivWrapper({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      layout
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={slideVariants}
      transition={{
        x: { type: "tween", duration: 0.45, ease: [0.16, 1, 0.3, 1] },
        opacity: { duration: 0.3, ease: "easeOut" },
        layout: { type: "spring", stiffness: 400, damping: 32 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
