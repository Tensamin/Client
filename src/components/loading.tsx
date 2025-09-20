"use client";

import Image from "next/image";
import { useStorageContext } from "@/context/storage";

export function Loading({ message }: { message?: string }) {
  const isError = (message?.split("_")[0] ?? "") === "ERROR";
  const { data } = useStorageContext();

  return (
    <div className="bg-background w-full h-screen flex flex-col justify-center items-center gap-10">
      <Image
        src={isError ? "/assets/images/logo.png" : "/assets/images/loading.gif"}
        width={400}
        height={400}
        alt="Image"
      />
      {isError || data?.debug ? (
        <p className="text-2xl font-semibold text-foreground">
          {message || "NO_MESSAGE"}
        </p>
      ) : null}
    </div>
  );
}
