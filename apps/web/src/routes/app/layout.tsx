import Socket from "@tensamin/ttp/context";
import User from "@tensamin/user/context";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";

import Sidebar from "@/components/sidebar";
import Conversation from "@/features/conversation/context";
import Navbar from "@/components/navbar";
import { useStorage } from "@tensamin/storage/context";

/**
 * Executes Layout.
 * @param props Parameter props.
 * @returns unknown.
 */
export default function Layout(props: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  const { load } = useStorage();

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log(location);

    load("user_id").then((userId) => {
      if (userId !== 0) {
        setLoggedIn(true);
      } else {
        navigate({
          to: "/login",
        });
        setLoggedIn(false);
      }
    });
  }, [location]);

  return (
    <Socket blockConnection={!loggedIn}>
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
