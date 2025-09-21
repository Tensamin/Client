"use client";

import { useStorageContext } from "@/context/storage";

export function Loading({ message }: { message?: string }) {
  const isError = (message?.split("_")[0] ?? "") === "ERROR";
  const { data } = useStorageContext();

  return (
    <div className="bg-background w-full h-screen flex flex-col justify-center items-center gap-10">
      <img
        src={isError ? "/assets/images/logo.png" : "/assets/images/loading.gif"}
        alt="Image"
        className="w-75 h-75"
      />
      {isError || data?.debug ? (
        <p className="text-2xl font-semibold text-foreground">
          {message || "NO_MESSAGE"}
        </p>
      ) : null}
    </div>
  );
}
