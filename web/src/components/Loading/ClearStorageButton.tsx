"use client";

import { useRouter } from "next/navigation";

import { useStorageContext } from "@/context/StorageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export default function ClearStorageButton() {
  const { clearAll } = useStorageContext();
  const router = useRouter();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Clear Storage</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{"Clear Storage"}</AlertDialogTitle>
          <AlertDialogDescription>
            {"This will clear all your settings and log you out of your account."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <div className="w-full" />
          <AlertDialogCancel>{"Cancel"}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              clearAll();
              router.refresh();
            }}
          >
            {"Clear Storage"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
