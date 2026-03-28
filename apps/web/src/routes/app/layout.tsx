import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

import Sidebar from "@/components/sidebar";
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

  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    void load("user_id").then((userId) => {
      if (!active) {
        return;
      }

      if (userId !== 0) {
        setLoggedIn(true);
        return;
      }

      setLoggedIn(false);
      void navigate({
        to: "/login",
      });
    });

    return () => {
      active = false;
    };
  }, [load, navigate]);

  if (loggedIn !== true) {
    return null;
  }

  return (
    <div className="w-full h-full flex bg-sidebar">
      <Sidebar />
      <div className="w-full h-full flex flex-col">
        <Navbar />
        <div className="bg-background h-full w-full rounded-tl-3xl border-t border-l">
          {props.children}
        </div>
      </div>
    </div>
  );
}
