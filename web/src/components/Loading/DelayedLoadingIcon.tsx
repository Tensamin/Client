"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Hourglass } from "ldrs/react";
import "ldrs/react/Hourglass.css";

import MotionDivWrapper from "@/components/animation/Presence";

interface DelayedLoadingIconProps {
  invert?: boolean;
}

export default function DelayedLoadingIcon({
  invert,
}: DelayedLoadingIconProps) {
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
