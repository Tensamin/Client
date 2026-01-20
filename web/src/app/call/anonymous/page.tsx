"use client";

// Package Imports
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import {
  createLocalAudioTrack,
  LocalAudioTrack,
  Track,
} from "livekit-client";
import * as Icon from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// Lib Imports
import * as CommunicationValue from "@/lib/communicationValues";
import { displayCallId } from "@/lib/utils";

// Context Imports
import { AnonymousProvider, useAnonymousContext } from "@/context/anonymous";

// Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/loading";

// Simple Mute Button for Anonymous Mode
function SimpleMuteButton({
  isMuted,
  onToggle,
  className,
}: {
  isMuted: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Button
      className={`h-9 ${className}`}
      variant={isMuted ? "destructive" : "ghost"}
      onClick={onToggle}
      aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
    >
      {isMuted ? <Icon.MicOff /> : <Icon.Mic />}
    </Button>
  );
}

// Simple Deafen Button for Anonymous Mode
function SimpleDeafButton({
  isDeafened,
  onToggle,
  className,
}: {
  isDeafened: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Button
      className={`h-9 ${className}`}
      variant={isDeafened ? "destructive" : "ghost"}
      onClick={onToggle}
      aria-label={isDeafened ? "Undeafen" : "Deafen"}
    >
      {isDeafened ? <Icon.HeadphoneOff /> : <Icon.Headphones />}
    </Button>
  );
}

// Simple Leave Button for Anonymous Mode
function SimpleLeaveButton({
  onLeave,
  className,
}: {
  onLeave: () => void;
  className?: string;
}) {
  return (
    <Button
      className={`h-9 ${className}`}
      variant="destructive"
      onClick={onLeave}
      aria-label="Leave call"
    >
      <Icon.LogOut />
    </Button>
  );
}

// Anonymous Call UI (stripped down version)
function AnonymousCallUI({ callId, onLeave }: { callId: string; onLeave: () => void }) {
  const { get, fetchedUsers } = useAnonymousContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  
  // Audio state management
  const [localTrack, setLocalTrack] = useState<LocalAudioTrack | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);

  // Get video tracks for display
  const videoTracks = useTracks([Track.Source.Camera], { onlySubscribed: false });

  // Initialize audio track
  useEffect(() => {
    let mounted = true;
    let track: LocalAudioTrack | null = null;

    const initAudio = async () => {
      if (!localParticipant) return;

      try {
        track = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });

        if (!mounted) {
          track.stop();
          return;
        }

        await localParticipant.publishTrack(track);
        
        // Start muted
        await track.mute();

        if (mounted) {
          setLocalTrack(track);
          setIsMuted(true);
        }
      } catch (error) {
        console.error("Failed to initialize audio:", error);
        toast.error("Failed to initialize microphone");
      }
    };

    initAudio();

    return () => {
      mounted = false;
      if (track) {
        track.stop();
      }
    };
  }, [localParticipant]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!localTrack) return;

    if (localTrack.isMuted) {
      await localTrack.unmute();
      if (isDeafened) {
        setIsDeafened(false);
      }
    } else {
      await localTrack.mute();
    }

    setIsMuted(localTrack.isMuted);
  }, [localTrack, isDeafened]);

  // Toggle deafen
  const toggleDeafen = useCallback(async () => {
    const newDeafenedState = !isDeafened;
    setIsDeafened(newDeafenedState);

    // Mute all audio elements
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((audio) => {
      audio.muted = newDeafenedState;
    });

    // Also mute ourselves when deafened
    if (localTrack) {
      if (newDeafenedState && !localTrack.isMuted) {
        await localTrack.mute();
        setIsMuted(true);
      }
    }
  }, [isDeafened, localTrack]);

  // Fetch user data for all participants
  useEffect(() => {
    participants.forEach((p) => {
      const userId = Number(p.identity);
      if (userId && !fetchedUsers.has(userId)) {
        get(userId, false);
      }
    });
  }, [participants, get, fetchedUsers]);

  return (
    <div className="flex flex-col w-full h-full gap-5 relative pb-11">
      {/* Call ID Header */}
      <div className="absolute pl-2 pt-3 h-6 top-0 left-0 flex gap-3 items-center">
        {displayCallId(callId)}
      </div>

      {/* Simplified Grid View */}
      <div className="flex-1 pt-10">
        <AnonymousCallGrid videoTracks={videoTracks} />
      </div>

      {/* Controls */}
      <div className="absolute bottom-3 left-0 flex justify-center w-full">
        <div className="flex gap-3 bg-card p-1.5 rounded-lg border">
          <SimpleMuteButton isMuted={isMuted} onToggle={toggleMute} className="w-10" />
          <SimpleDeafButton isDeafened={isDeafened} onToggle={toggleDeafen} className="w-10" />
          <SimpleLeaveButton onLeave={onLeave} className="w-10" />
        </div>
      </div>
    </div>
  );
}

// Anonymous Grid Component
function AnonymousCallGrid({ videoTracks }: { videoTracks: ReturnType<typeof useTracks> }) {
  const participants = useParticipants();
  const { get, fetchedUsers } = useAnonymousContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Calculate optimal grid layout
  const layout = useMemo(() => {
    const count = participants.length || 1;
    const { width, height } = containerSize;
    if (width === 0 || height === 0) return { width: 0, height: 0, cols: 1 };

    const gap = 16;
    let bestCols = 1;
    let bestWidth = 0;
    let bestHeight = 0;

    for (let cols = 1; cols <= count; cols++) {
      const rows = Math.ceil(count / cols);
      const tileWidth = (width - gap * (cols - 1)) / cols;
      const tileHeight = (height - gap * (rows - 1)) / rows;
      const aspectRatio = 16 / 9;

      let finalWidth = tileWidth;
      let finalHeight = tileWidth / aspectRatio;

      if (finalHeight > tileHeight) {
        finalHeight = tileHeight;
        finalWidth = tileHeight * aspectRatio;
      }

      if (finalWidth * finalHeight > bestWidth * bestHeight) {
        bestWidth = finalWidth;
        bestHeight = finalHeight;
        bestCols = cols;
      }
    }

    return { width: bestWidth, height: bestHeight, cols: bestCols };
  }, [participants.length, containerSize]);

  return (
    <div className="h-full w-full relative">
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center py-7 overflow-hidden"
      >
        <div className="flex flex-wrap justify-center gap-4 max-w-full max-h-full">
          {participants.map((participant) => {
            const userId = Number(participant.identity);
            const user = fetchedUsers.get(userId);
            
            // Check if this participant has a video track
            const videoTrack = videoTracks.find(
              (t) => t.participant.identity === participant.identity && t.publication?.track
            );
            const hasVideo = !!videoTrack?.publication?.track;

            return (
              <div
                key={participant.identity}
                style={{
                  width: layout.width,
                  height: layout.height,
                }}
                className={`bg-card border rounded-lg flex items-center justify-center relative overflow-hidden ${
                  participant.isSpeaking ? "ring-2 ring-green-500" : ""
                }`}
              >
                {hasVideo && videoTrack.publication ? (
                  // Show video track
                  <VideoTrack
                    trackRef={videoTrack as import("@livekit/components-core").TrackReference}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // Avatar placeholder
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.display}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Icon.User className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {user?.display || `User ${userId}`}
                    </span>
                  </div>
                )}

                {/* Name overlay when video is on */}
                {hasVideo && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-xs">
                    {user?.display || `User ${userId}`}
                  </div>
                )}

                {/* Speaking indicator */}
                {participant.isSpeaking && (
                  <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Pre-connect Screen
function PreConnectScreen({
  onConnect,
  callId,
}: {
  onConnect: (name: string) => void;
  callId: string;
}) {
  const [name, setName] = useState("");

  return (
    <div className="w-full h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-2xl">Join Call</CardTitle>
          <CardDescription>
            You&apos;re about to join call {displayCallId(callId)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  onConnect(name.trim());
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              This name will be shown to other participants
            </p>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={() => onConnect(name.trim())}
          >
            <Icon.Phone className="mr-2 h-4 w-4" />
            Connect
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Anonymous Call Content (inside provider)
function AnonymousCallContent({
  callId,
  userId,
}: {
  callId: string;
  userId: number;
}) {
  const { send, connected, setCustomName, customName } = useAnonymousContext();
  const [token, setToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [shouldConnect, setShouldConnect] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  const handleConnect = async (name: string) => {
    if (!connected) {
      toast.error("Not connected to server. Please wait...");
      return;
    }

    setIsConnecting(true);
    setCustomName(name);

    try {
      // Get call token via anonymous WebSocket
      const response = (await send("call_token", {
        call_id: callId,
        user_id: userId,
        display_name: name,
      })) as CommunicationValue.call_token;

      if (response.call_token) {
        setToken(response.call_token);
        setShouldConnect(true);
        setHasJoined(true);
      } else {
        toast.error("Failed to get call token");
      }
    } catch (error) {
      console.error("Failed to get call token:", error);
      toast.error("Failed to join call. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLeave = useCallback(() => {
    setShouldConnect(false);
    setHasJoined(false);
    setToken("");
  }, []);

  if (!connected) {
    return <Loading message="Connecting to server..." />;
  }

  if (isConnecting) {
    return <Loading message="Joining call..." />;
  }

  if (!hasJoined) {
    return <PreConnectScreen onConnect={handleConnect} callId={callId} />;
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl="wss://call.tensamin.net"
      connect={shouldConnect}
      audio={false}
      video={false}
      screen={false}
      onConnected={() => {
        toast.success("Connected to call");
      }}
      onDisconnected={() => {
        toast.info("Disconnected from call");
        setShouldConnect(false);
        setHasJoined(false);
      }}
    >
      <RoomAudioRenderer />
      <AnonymousCallUI callId={callId} onLeave={handleLeave} />
    </LiveKitRoom>
  );
}

// Page Content with params parsing
function PageContent() {
  const searchParams = useSearchParams();
  const callId = searchParams.get("call_id");
  const userIdParam = searchParams.get("user_id");
  const userId = userIdParam ? Number(userIdParam) : 0;

  if (!callId || !userId) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">
              Invalid Link
            </CardTitle>
            <CardDescription>
              This anonymous call link is missing required parameters. Please
              check the link and try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Required: call_id and user_id
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AnonymousProvider userId={userId}>
      <AnonymousCallContent callId={callId} userId={userId} />
    </AnonymousProvider>
  );
}

// Main Page Export
export default function Page() {
  return (
    <Suspense fallback={<Loading message="Loading..." />}>
      <PageContent />
    </Suspense>
  );
}
