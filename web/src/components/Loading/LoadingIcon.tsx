"use client";

import { useEffect, useState } from "react";

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

interface LoadingIconProps {
  invert?: boolean;
  size?: number;
}

export default function LoadingIcon({ invert, size = 1 }: LoadingIconProps) {
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
    <div style={{ scale: size }}>
      <Tag
        // @ts-expect-error Dynamic tag element
        stroke={size * 3.5}
        bgOpacity="0"
        speed="2"
        color={invert ? "var(--background)" : "var(--foreground)"}
      />
    </div>
  );
}
