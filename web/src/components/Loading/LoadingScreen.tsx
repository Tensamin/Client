"use client";

import { useEffect, useState } from "react";

import { useStorageContext } from "@/context/StorageContext";
import RawLoading from "./RawLoading";

interface LoadingScreenProps {
  message?: string;
  extra?: string;
  isError?: boolean;
  progress?: number;
}

export default function LoadingScreen({
  message,
  extra,
  isError: isErrorProp,
  progress,
}: LoadingScreenProps) {
  const isError = isErrorProp || (message?.split("_")[0] ?? "") === "ERROR";
  const { data } = useStorageContext();

  const [showClearButton, setShowClearButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowClearButton(true);
    }, 3000);

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

// Also export as Loading for backwards compatibility
export { default as Loading } from "./LoadingScreen";
