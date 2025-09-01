// Package Imports
import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";

// Context Imports
import { useUsersContext } from "@/components/context/users";
import { useThemeContext } from "@/components/context/theme";
import { useCallContext } from "@/components/context/call";
import { usePageContext } from "@/components/context/page";

// Components
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserModal } from "@/components/page/root/user-modal/main";
import { Chats } from "@/components/page/root/chats";
import { Communities } from "@/components/page/root/communities";
import { VoiceControls } from "@/components/page/voice/controls";

// Main
export function AppSidebar(props) {
  let { forceLoad, ownUuid } = useUsersContext();
  let { sidebarRightSide } = useThemeContext();
  let { connected } = useCallContext();
  let { sidebarCategory, setSidebarCategory } = usePageContext();

  return (
    <Sidebar
      className="p-0"
      side={sidebarRightSide ? "right" : "left"}
      variant="inset"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="border-1 bg-card rounded-xl">
            <SidebarMenuButton size="lg" asChild>
              <UserModal id={ownUuid} state="ONLINE" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {connected && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <VoiceControls />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <SidebarMenu className="pt-1.5">
          <SidebarMenuItem>
            {(() => {
              let controls = useAnimationControls();
              let prev = useRef(sidebarCategory);

              useEffect(() => {
                controls.set(
                  sidebarCategory === "communities"
                    ? { left: "0%", right: "50%" }
                    : { left: "50%", right: "0%" }
                );
                prev.current = sidebarCategory;
              }, []);

              useEffect(() => {
                if (prev.current === sidebarCategory) return;

                controls.stop();
                controls
                  .start({
                    left: "0%",
                    right: "0%",
                    transition: {
                      duration: 0.22,
                      ease: [0.2, 0.8, 0.2, 1],
                    },
                  })
                  .then(() =>
                    controls.start(
                      sidebarCategory === "communities"
                        ? {
                          left: "0%",
                          right: "50%",
                          transition: {
                            duration: 0.28,
                            ease: [0.16, 1, 0.3, 1],
                          },
                        }
                        : {
                          left: "50%",
                          right: "0%",
                          transition: {
                            duration: 0.28,
                            ease: [0.16, 1, 0.3, 1],
                          },
                        }
                    )
                  );

                prev.current = sidebarCategory;
              }, [sidebarCategory, controls]);

              return (
                <div className="relative w-full rounded-full border bg-card p-1">
                  <div className="relative">
                    <motion.div
                      className="pointer-events-none absolute top-0 bottom-0 z-0 
                       rounded-full bg-input/50 border"
                      style={{ left: "0%", right: "50%", willChange: "left, right" }}
                      initial={false}
                      animate={controls}
                    />

                    <div className="relative z-10 grid grid-cols-2">
                      <Button
                        variant="ghost"
                        className="w-full rounded-full select-none py-2 justify-center dark:hover:bg-transparent hover:font-bold"
                        disabled={forceLoad}
                        onClick={() => {
                          if (sidebarCategory !== "communities") {
                            setSidebarCategory("communities");
                          }
                        }}
                        aria-pressed={sidebarCategory === "communities"}
                      >
                        Communities
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full rounded-full select-none py-2 justify-center dark:hover:bg-transparent hover:font-bold"
                        disabled={forceLoad}
                        onClick={() => {
                          if (sidebarCategory !== "chats") {
                            setSidebarCategory("chats");
                          }
                        }}
                        aria-pressed={sidebarCategory === "chats"}
                      >
                        Chats
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <SidebarMenu>
          {sidebarCategory === "chats" ? <Chats /> : <Communities />}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
