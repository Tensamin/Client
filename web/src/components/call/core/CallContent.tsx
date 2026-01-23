"use client";

// Package Imports
import { Track } from "livekit-client";
import * as Icon from "lucide-react";
import { useEffect, useRef } from "react";

// Lib Imports
import { displayCallId } from "@/lib/utils";

// Core Context Imports
import { useCallSession } from "./CallSessionContext";
import { CallPageProvider, useCallPageContext } from "./CallPageContext";

// Components
import { MuteButton, DeafButton } from "./Buttons";
import Grid from "./Grid";
import { PopoutScreenShare } from "@/components/call/view/ScreenSharePopout";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Inner content component
function CallContentInner({
  onLeave,
  showMoreOptions = true,
}: {
  onLeave?: () => void;
  showMoreOptions?: boolean;
}) {
  const { callId, disconnect, setCurrentLayout, stopWatching } =
    useCallSession();

  const {
    focusedTrackRef,
    setFocusedTrackSid,
    hideParticipants,
    setHideParticipants,
    popoutScreenShare,
    closePopout,
  } = useCallPageContext();

  useEffect(() => {
    if (focusedTrackRef) {
      setCurrentLayout("focus");
    } else {
      setCurrentLayout("grid");
    }
  }, [focusedTrackRef, setCurrentLayout]);

  const innerCallPageContainer = useRef<HTMLDivElement>(null);

  const handleLeave = () => {
    if (focusedTrackRef) {
      setFocusedTrackSid(null);
      if (focusedTrackRef.source === Track.Source.ScreenShare) {
        stopWatching(Number(focusedTrackRef.participant.identity));
      }
    } else {
      if (onLeave) {
        onLeave();
      } else {
        disconnect();
      }
    }
  };

  return (
    <div className="flex flex-col w-full h-screen gap-5 relative pb-11">
      {/* Call ID Header */}
      <div className="absolute pl-2 pt-3 h-6 top-0 left-0 flex gap-3 items-center">
        {displayCallId(callId)}
      </div>

      {/* Main Content */}
      <div className="flex-1 pt-10" ref={innerCallPageContainer}>
        <Grid className="h-full" />
      </div>

      {/* Controls */}
      <div className="absolute bottom-3 left-0 flex justify-center w-full">
        <div className="flex gap-3 bg-card p-1.5 rounded-lg border">
          {/* Mute Button */}
          <MuteButton ghostMode className="w-10" />
          {/* Deaf Button */}
          <DeafButton ghostMode className="w-10" />
          {/* Leave Button */}
          <Button
            className="w-10 h-9"
            variant="destructive"
            onClick={handleLeave}
          >
            {focusedTrackRef ? <Icon.X /> : <Icon.LogOut />}
          </Button>
          {/* More Options */}
          {showMoreOptions && (
            <Popover>
              <PopoverTrigger asChild>
                <Button className="w-10 h-9" variant="ghost">
                  <Icon.EllipsisVertical />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="flex flex-col gap-2 w-55">
                <div className="flex justify-between">
                  <Label htmlFor="hide-participants">Hide Participants</Label>
                  <Switch
                    id="hide-participants"
                    checked={hideParticipants}
                    onCheckedChange={setHideParticipants}
                  />
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Popout Screen Share */}
      {popoutScreenShare && (
        <PopoutScreenShare
          trackRef={popoutScreenShare.trackRef}
          title={popoutScreenShare.title}
          onClose={closePopout}
        />
      )}
    </div>
  );
}

// Main component with provider wrapper
export default function CallContent({
  onLeave,
  showMoreOptions = true,
}: {
  onLeave?: () => void;
  showMoreOptions?: boolean;
}) {
  return (
    <CallPageProvider>
      <CallContentInner onLeave={onLeave} showMoreOptions={showMoreOptions} />
    </CallPageProvider>
  );
}
