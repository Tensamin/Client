"use client";

// Package Imports
import { Track } from "livekit-client";
import { useTracks, ParticipantTile } from "@livekit/components-react";

// Components
import { GridLayout } from "@livekit/components-react";
import { Card, CardContent } from "@/components/ui/card";
import { CallUserModal } from "@/components/modals/call";

// Main
export default function Page() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <Card className="flex-1">
        <CardContent>
          <GridLayout tracks={tracks}>
            <ParticipantTile className="aspect-video">
              <div className="w-full h-full flex items-center justify-center">
                <CallUserModal />
              </div>
            </ParticipantTile>
          </GridLayout>
        </CardContent>
      </Card>
    </div>
  );
}
