"use client";

import { LoadingIcon } from "@/components/loading";
import { useEffect, useState } from "react";

export default function Page() {
  const [info, setInfo] = useState("Initializing...");

  useEffect(() => {
    // @ts-expect-error Electron API only exists in Electron environment
    if (typeof window !== "undefined" && window.electronAPI) {
      // @ts-expect-error Electron API only exists in Electron environment
      const cleanup = window.electronAPI.onUpdateLog(
        (payload: { message: string }) => {
          if (payload && payload.message) {
            setInfo(payload.message);
          }
        },
      );
      return cleanup;
    }
  }, []);

  return (
    <div className="w-full h-screen flex flex-col gap-10 justify-center items-center electron-drag">
      <LoadingIcon size={1.15} />
      <p className="font-semibold">{info}</p>
    </div>
  );
}
