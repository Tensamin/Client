"use client";

import { useStorageContext } from "@/context/storage";
import { Top } from "../page";
import { toast } from "sonner";
import { useEffect } from "react";

export default function Page() {
  const { onShortcut, isElectron } = useStorageContext();

  useEffect(() => {
    if (!isElectron) return;
    onShortcut("test", () => {
      toast.info("Test shortcut triggered!");
    });
  }, [onShortcut, isElectron]);

  return (
    <Top text="Shortcuts Settings">
      <p>Temp</p>
    </Top>
  );
}
