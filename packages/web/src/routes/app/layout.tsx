import Socket from "@tensamin/ttp/context";
import User from "@tensamin/core-user/context";
import type { RouteSectionProps } from "@solidjs/router";

import Sidebar from "@/components/sidebar";
import Conversation from "@/features/conversation/context";
import Navbar from "@/components/navbar";

export default function Layout(props: RouteSectionProps) {
  return (
    <Socket>
      <User>
        <Conversation>
          <div class="w-full h-full flex bg-sidebar">
            <Sidebar />
            <div class="w-full h-full flex flex-col">
              <Navbar />
              <div class="bg-background h-full w-full rounded-tl-3xl border-t border-l">
                {props.children}
              </div>
            </div>
          </div>
        </Conversation>
      </User>
    </Socket>
  );
}
