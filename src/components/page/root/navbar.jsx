// Package Imports
import * as Icon from "lucide-react";
import { Ring } from "ldrs/react";
import "ldrs/react/Ring.css";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { v7 } from "uuid";

// Lib Imports
import { cn } from "@/lib/utils";

// Context Imports
import { usePageContext } from "@/components/context/page";
import { useMessageContext } from "@/components/context/message";
import { useUsersContext } from "@/components/context/users";
import { useThemeContext } from "@/components/context/theme";
import { useCallContext } from "@/components/context/call";

// Components
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

// Framer Motion stuff
let containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
    },
  },
};

let itemVariants = {
  hidden: { y: -20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
  exit: { y: -20, opacity: 0, transition: { duration: 0.2 } },
};

// Main
export function Navbar() {
  let { sidebarRightSide } = useThemeContext();
  let { get } = useUsersContext();
  let { open } = useSidebar();
  let { setPage } = usePageContext();
  let { failedMessages, navbarLoading, navbarLoadingMessage, receiver } =
    useMessageContext();
  let { startCall } = useCallContext();

  let [receiverDisplay, setReceiverDisplay] = useState("");

  useEffect(() => {
    if (receiver !== "") {
      get(receiver).then((data) => {
        setReceiverDisplay(data.display);
      });
    } else {
      setReceiverDisplay("");
    }
  }, [receiver]);

  return (
    <div
      className={`flex-1 flex items-center pt-2 mx-2.5`}
      style={{ WebkitAppRegion: "drag" }}
    >
      {!sidebarRightSide ? (
        <div
          className={cn(
            "bg-sidebar hidden md:block transition-all duration-300",
            open ? "w-[var(--sidebar-width)]" : "w-0",
          )}
        />
      ) : (
        <WindowControls side="left" />
      )}
      <motion.div
        className="bg-sidebar flex-1 flex items-center gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div layout="position" variants={itemVariants}>
          <SidebarTrigger
            className="w-9 h-9"
            style={{ WebkitAppRegion: "no-drag" }}
          />
        </motion.div>

        <motion.div layout="position" variants={itemVariants}>
          <Button
            className="w-9 h-9"
            variant="outline"
            style={{ WebkitAppRegion: "no-drag" }}
            onClick={() => setPage({ name: "home", data: "" })}
          >
            <Icon.House />
          </Button>
        </motion.div>

        <motion.div layout="position" variants={itemVariants}>
          <Button
            className="w-9 h-9"
            variant="outline"
            style={{ WebkitAppRegion: "no-drag" }}
            onClick={() => setPage({ name: "settings", data: "" })}
          >
            <Icon.Settings />
          </Button>
        </motion.div>

        <AnimatePresence>
          {receiverDisplay !== "" && (
            <motion.div
              layout="position"
              key="receiver-display"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <p className="font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                {receiverDisplay}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          layout
          className="w-full"
          variants={itemVariants}
          style={{ WebkitAppRegion: "drag" }}
        />

        <AnimatePresence>
          {navbarLoading && (
            <motion.div
              layout="position"
              key="loading-indicator"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button
                    className="w-9 h-9"
                    variant="outline"
                    style={{ WebkitAppRegion: "no-drag" }}
                  >
                    <Ring
                      size="16"
                      stroke="2"
                      bgOpacity="0"
                      speed="2"
                      color="var(--foreground)"
                    />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent style={{ WebkitAppRegion: "no-drag" }}>
                  <p className="text-sm">{navbarLoadingMessage}</p>
                </HoverCardContent>
              </HoverCard>
            </motion.div>
          )}
          {failedMessages > 0 && (
            <motion.div
              layout="position"
              key="failed-messages-indicator"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button
                    style={{ WebkitAppRegion: "no-drag" }}
                    className="w-9 h-9 text-destructive"
                    variant="outline"
                  >
                    <Icon.TriangleAlert />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent style={{ WebkitAppRegion: "no-drag" }}>
                  <p className="text-sm text-destructive">
                    Failed to load {failedMessages}{" "}
                    {failedMessages === 1 ? "message" : "messages"}.
                  </p>
                </HoverCardContent>
              </HoverCard>
            </motion.div>
          )}
          {receiver !== "" && (
            <motion.div
              layout="position"
              key="call-button"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Button
                className="w-9 h-9"
                variant="outline"
                style={{ WebkitAppRegion: "no-drag" }}
                onClick={() => {
                  startCall(true, v7(), v7());
                }}
              >
                <Icon.PhoneCall />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {sidebarRightSide ? (
        <div
          className={cn(
            "bg-sidebar hidden md:block transition-all duration-300",
            open ? "w-[var(--sidebar-width)]" : "w-0",
          )}
        />
      ) : (
        <WindowControls side="right" />
      )}
    </div>
  );
}

function WindowControls({ side }) {
  let { hideWindowControls } = useThemeContext();
  let { usingElectron } = useUsersContext();

  return (
    usingElectron &&
    !hideWindowControls && (
      <>
        <motion.div
          layout="position"
          key="window-controls"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={`flex w-auto border bg-input/50 rounded-lg ${side === "left" ? "mr-3" : "ml-3"}`}
        >
          {side === "left" ? (
            <>
              <Button
                className="w-9 h-9 scale-90 text-accent-foreground"
                variant="ghost"
                style={{ WebkitAppRegion: "no-drag" }}
                onClick={() => {
                  window.windowControls.close();
                }}
              >
                <Icon.X strokeWidth={2.7} />
              </Button>
              <Button
                className="w-9 h-9 scale-90 text-accent-foreground"
                variant="ghost"
                style={{ WebkitAppRegion: "no-drag" }}
                onClick={() => {
                  window.windowControls.toggleMaximize();
                }}
              >
                <Icon.Maximize2 strokeWidth={2.7} />
              </Button>
              <Button
                className="w-9 h-9 scale-90 text-accent-foreground"
                variant="ghost"
                style={{ WebkitAppRegion: "no-drag" }}
                onClick={() => {
                  window.windowControls.minimize();
                }}
              >
                <Icon.ChevronDown strokeWidth={2.7} />
              </Button>
            </>
          ) : (
            <>
              <Button
                className="w-9 h-9 scale-90 text-accent-foreground"
                variant="ghost"
                style={{ WebkitAppRegion: "no-drag" }}
                onClick={() => {
                  window.windowControls.minimize();
                }}
              >
                <Icon.ChevronDown strokeWidth={2.7} />
              </Button>
              <Button
                className="w-9 h-9 scale-90 text-accent-foreground"
                variant="ghost"
                style={{ WebkitAppRegion: "no-drag" }}
                onClick={() => {
                  window.windowControls.toggleMaximize();
                }}
              >
                <Icon.Maximize2 strokeWidth={2.7} />
              </Button>
              <Button
                className="w-9 h-9 scale-90 text-accent-foreground"
                variant="ghost"
                style={{ WebkitAppRegion: "no-drag" }}
                onClick={() => {
                  window.windowControls.close();
                }}
              >
                <Icon.X strokeWidth={2.7} />
              </Button>
            </>
          )}
        </motion.div>
      </>
    )
  );
}
