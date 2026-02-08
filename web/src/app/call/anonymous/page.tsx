"use client";

// Package Imports
import * as Icon from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Lib Imports
import { displayCallId } from "@/lib/utils";

// Context Imports
import { AnonymousProvider, useAnonymousContext } from "@/context/AnonymousContext";

// Core Call Components
import {
  CallSessionProvider,
  UserDataProvider,
  CallContent,
  type CallSessionConfig,
  type UserData,
} from "@/components/call/core";

// Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { default as Loading } from "@/components/Loading/LoadingScreen";

// Pre-connect Screen with user preview
function PreConnectScreen({ onConnect }: { onConnect: () => void }) {
  const { userData, callData } = useAnonymousContext();

  if (!userData || !callData) {
    return <Loading message="Loading call data..." />;
  }

  return (
    <div className="w-full h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <CardTitle className="text-2xl">Join Call</CardTitle>
          <CardDescription>
            You&apos;re about to join call {displayCallId(callData.call_id)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* User Preview */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center overflow-hidden border">
              {userData.avatar ? (
                <img
                  src={`data:image/webp;base64,${userData.avatar}`}
                  alt={userData.display}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Icon.User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium">{userData.display}</p>
              <p className="text-sm text-muted-foreground">
                @{userData.username}
              </p>
            </div>
          </div>

          {/* Custom Name Input */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="display-name">Display Name</Label>
            <p className="text-xs text-muted-foreground">
              This name will be shown to other participants (leave empty to use
              default)
            </p>
          </div>

          {/* Call Info */}
          <div className="flex flex-col gap-2">
            <Label>Call Information</Label>
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p>
                <span className="text-muted-foreground">Participants:</span>{" "}
                {callData.call_members.length}
              </p>
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={() => onConnect()}>
            <Icon.Phone className="mr-2 h-4 w-4" />
            Connect
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Anonymous Call UI using modular components
function AnonymousCallUI({ onLeave }: { onLeave: () => void }) {
  const { fetchedUsers, userData } = useAnonymousContext();

  // Convert fetchedUsers Map to the format expected by UserDataProvider
  const initialUsers = new Map<number, UserData>();
  fetchedUsers.forEach((user, id) => {
    initialUsers.set(id, {
      id: user.id,
      username: user.username,
      display: user.display,
      avatar: user.avatar,
      about: user.about,
      status: user.status,
      state: user.state,
      loading: user.loading,
    });
  });

  return (
    <UserDataProvider
      initialUsers={initialUsers}
      ownId={userData?.user_id ?? null}
    >
      <CallContent onLeave={onLeave} showMoreOptions={false} />
    </UserDataProvider>
  );
}

// Main Anonymous Call Content (inside provider)
function AnonymousCallContent({ callId }: { callId: string }) {
  const {
    connected,
    identificationState,
    identificationError,
    userData,
    callData,
    identify,
  } = useAnonymousContext();

  const [shouldConnect, setShouldConnect] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const identifyAttempted = useRef(false);

  // Identify when connected
  useEffect(() => {
    if (
      connected &&
      identificationState === "connecting" &&
      !identifyAttempted.current
    ) {
      identifyAttempted.current = true;
      identify(callId).catch(() => {
        // Error handling is done in the context
      });
    }
  }, [connected, identificationState, callId, identify]);

  const handleConnect = useCallback(() => {
    if (!callData) {
      toast.error("Call data not available");
      return;
    }

    setShouldConnect(true);
    setHasJoined(true);
  }, [callData]);

  const handleLeave = useCallback(() => {
    setShouldConnect(false);
    setHasJoined(false);
  }, []);

  // Loading states
  if (!connected || identificationState === "connecting") {
    return <Loading message="Connecting to server..." />;
  }

  if (identificationState === "identifying") {
    return <Loading message="Loading call information..." />;
  }

  if (identificationState === "error") {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">
              Connection Error
            </CardTitle>
            <CardDescription>
              {identificationError ||
                "Failed to connect to the call. Please check your link and try again."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!hasJoined) {
    return <PreConnectScreen onConnect={handleConnect} />;
  }

  if (!callData || !userData) {
    return <Loading message="Preparing call..." />;
  }

  // Create config for CallSessionProvider
  const callConfig: CallSessionConfig = {
    token: callData.call_token,
    serverUrl: "wss://call.tensamin.net",
    callId: callData.call_id,
    onConnected: () => {
      toast.success("Connected to call");
    },
    onDisconnected: () => {
      toast.info("Disconnected from call");
      setShouldConnect(false);
      setHasJoined(false);
    },
  };

  // Use the modular CallSessionProvider with the call UI
  if (shouldConnect) {
    return (
      <CallSessionProvider
        config={callConfig}
        onDisconnect={handleLeave}
        isAdmin={false}
        anonymousJoining={true}
      >
        <AnonymousCallUI onLeave={handleLeave} />
      </CallSessionProvider>
    );
  }

  // Fallback while preparing to connect
  return <Loading message="Preparing call..." />;
}

// Main Page Export
export default function Page() {
  const searchParams = useSearchParams();
  const callId = searchParams.get("call_id");

  if (!callId) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">
              Invalid Link
            </CardTitle>
            <CardDescription>
              This anonymous call link is missing the call ID. Please check the
              link and try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Required: call_id</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AnonymousProvider>
      <AnonymousCallContent callId={callId} />
    </AnonymousProvider>
  );
}
