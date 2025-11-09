"use client";

// Package Imports
import { useCallback, useState } from "react";
import { toast } from "sonner";

// Lib Imports
import { username_to_uuid } from "@/lib/endpoints";
import { handleError } from "@/lib/utils";

// Context Imports
import { useSocketContext } from "@/context/socket";
import { useUserContext } from "@/context/user";
import { useStorageContext } from "@/context/storage";
import { useCallContext } from "@/context/call";

// Components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingIcon } from "@/components/loading";
import { PageDiv } from "@/components/pageDiv";
import { CallModal } from "@/components/modals/user";
import { Checkbox } from "@/components/ui/checkbox";

// Main
export default function Page() {
  const { users, state, exitCall } = useCallContext();
  const { get } = useUserContext();

  const usersLength = users.size;

  return (
    <PageDiv className="flex flex-col gap-4 h-full">
      <div className="flex-1 w-full">{/* Main Container */}</div>
      <div className="w-1/2 flex justify-center items-center border rounded-2xl">
        <div className=""></div>
      </div>
      {Array.from(users).map(([uuid, user]) => (
        <div key={uuid} className="flex items-center gap-2">
          <CallModal
            uuid={uuid}
            size={usersLength === 1 ? "large" : "medium"}
          />
        </div>
      ))}
      <p>Vall</p>
    </PageDiv>
  );
}
