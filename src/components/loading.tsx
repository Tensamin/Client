"use client";

// Package Imports
import { useEffect, useState } from "react";
import { Ring } from "ldrs/react";
import "ldrs/react/Ring.css";

// Context Imports
import { useStorageContext } from "@/context/storage";

// Components
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// Main
export function Loading({ message }: { message?: string }) {
  const isError = (message?.split("_")[0] ?? "") === "ERROR";
  const { data, clearAll } = useStorageContext();

  const [showClearButton, setShowClearButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowClearButton(true);
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="bg-background w-full h-screen flex flex-col justify-center items-center gap-10">
        <img
          src={
            isError ? "/assets/images/logo.png" : "/assets/images/loading.gif"
          }
          alt="Image"
          className="w-75 h-75"
        />
        {isError || data?.debug ? (
          <p className="text-2xl font-semibold text-foreground">
            {message || "NO_MESSAGE"}
          </p>
        ) : null}
      </div>
      {showClearButton || isError ? (
        <div className="fixed top-0 left-0 m-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Clear Storage</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Storage</AlertDialogTitle>
                <AlertDialogDescription>
                  This will clear all data stored in your browser storage,
                  including your user and theme data. This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    clearAll();
                    window.location.reload();
                  }}
                >
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : null}
    </>
  );
}

export function LoadingIcon({ invert }: { invert?: boolean }) {
  return (
    <Ring
      size="17"
      stroke="2"
      bgOpacity="0"
      speed="2"
      color={invert ? "var(--background)" : "var(--foreground)"}
    />
  );
}
