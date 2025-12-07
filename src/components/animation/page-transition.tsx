"use client";

import { motion } from "framer-motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const durationBase = 1;
  const firstAnimation = 0.16;
  const secondAnimation = 0.12;
  return (
    <motion.div
      initial={{
        scale: 0.97,
        y: 18,
        border: "0px solid transparent",
        borderRadius: "15px",
      }}
      animate={{
        scale: 1,
        y: 0,
        border: "0px solid transparent",
        borderRadius: "0px",
      }}
      transition={{
        scale: {
          duration: durationBase * secondAnimation,
          ease: "easeOut",
          delay: durationBase * firstAnimation,
        },
        y: { duration: durationBase * firstAnimation, ease: "easeOut" },
        border: { duration: durationBase * 0.5, ease: "easeOut" },
        borderRadius: {
          duration: durationBase * secondAnimation,
          ease: "easeOut",
          delay: durationBase * firstAnimation,
        },
      }}
      className="w-full h-full overflow-hidden"
    >
      {children}
    </motion.div>
  );
}
