"use client";

// Package Imports
import { useEffect, useState } from "react";

// Components
import { RawLoading } from "@/components/loading";

// Types
type UpdateLogEntry = {
  level: "info" | "error";
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
};

// Main
export default function Page() {
  const [logs, setLogs] = useState<UpdateLogEntry[]>([]);

  useEffect(() => {
    // @ts-expect-error Electron API only available in Electron
    const unsubscribe = window.electronAPI.onUpdateLog(
      (entry: UpdateLogEntry) => {
        setLogs((prev) => [entry, ...prev].slice(0, 100));
      }
    );
    return unsubscribe;
  }, []);

  return (
    <RawLoading
      messageSize="small"
      message={logs[0]?.message ?? "Updating"}
      isError={false}
      debug={true}
    />
  );
}
