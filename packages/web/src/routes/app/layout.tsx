import Socket from "@tensamin/ttp/context";
import User from "@tensamin/core-user/context";
import type { ReactNode } from "react";

import Sidebar from "@/components/sidebar";
import Conversation from "@/features/conversation/context";
import Navbar from "@/components/navbar";

export default function Layout(props: { children: ReactNode }) {
  return (
    <Socket>
      <User>
        <Conversation>
          <div className="w-full h-full flex bg-sidebar">
            <Sidebar />
            <div className="w-full h-full flex flex-col">
              <Navbar />
              <div className="bg-background h-full w-full rounded-tl-3xl border-t border-l">
                {props.children}
              </div>
            </div>
          </div>
        </Conversation>
      </User>
    </Socket>
  );
}
