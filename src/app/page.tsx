"use client";

// Package Imports
import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useTransition,
} from "react";
import { MagicTabSelect } from "react-magic-motion";

// Context Imports
import { SidebarProvider } from "@/components/ui/sidebar";
import { CryptoProvider } from "@/context/crypto";
import { SocketProvider } from "@/context/socket";
import { UserProvider } from "@/context/user";

// Components
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Loading } from "@/components/loading";
import { UserModal } from "@/components/modals/user";
import LoginPage from "@/page/login";
import HomePage from "@/page/home";
import SettingsPage from "@/page/settings";

type PageContextType = {
  page: string;
  pageData?: string;
  setPage: (page: string, data?: string) => void;
};

const PageContext = createContext<PageContextType | null>(null);

export function usePageContext() {
  const context = useContext(PageContext);
  if (!context)
    throw new Error("useContext function used outside of its provider");
  return context;
}

export default function PageProvider() {
  const [page, setPageRaw] = useState("home");
  const [pageData, setPageData] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState(0);

  function setPage(page: string, data: string = "") {
    setPageRaw(page);
    setPageData(data);
  }

  if (page === "error") return <Loading message={pageData || "ERROR"} />;
  if (page === "login")
    return (
      <CryptoProvider>
        <LoginPage />
      </CryptoProvider>
    );

  function Common({ children }: { children: React.ReactNode }) {
    const { open } = useSidebar();

    return (
      <>
        <Sidebar className="group-data-[side=left]:border-0">
          <SidebarHeader className="p-1">
            <UserModal uuid={localStorage.getItem("auth_uuid") || ""} />
            <div className="rounded-full bg-input/30 border border-input flex p-2">
              {["Chats", "Communities"].map((option, index) => {
                return (
                  <button
                    key={index}
                    onClick={() => setHoveredIndex(index)}
                    className="relative w-1/2"
                  >
                    {hoveredIndex === index && (
                      <MagicTabSelect
                        id="switch"
                        transition={{ layout: { duration: 0.32, ease: "easeInOut" } }}
                      >
                        <span
                          style={{
                            borderRadius: "999px",
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 10,
                            backgroundColor: "white",
                            mixBlendMode: "difference",
                          }}
                        />
                      </MagicTabSelect>
                    )}
                    {option}
                  </button>
                );
              })}
            </div>
          </SidebarHeader>
          <SidebarContent></SidebarContent>
        </Sidebar>
        <div className="w-full h-screen flex flex-col bg-sidebar overflow-hidden">
          <Navbar />
          <div
            className={`${open && "rounded-tl-xl border-l"} w-full h-full border-t bg-background p-2`}
          >
            {children}
          </div>
        </div>
      </>
    );
  }

  function PageSwitch() {
    switch (page) {
      case "home":
        return <HomePage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <div>Unkown Page</div>;
    }
  }

  return (
    <PageContext.Provider value={{ page, pageData, setPage }}>
      <CryptoProvider>
        <UserProvider>
          <SocketProvider>
            <SidebarProvider>
              <Common>
                <PageSwitch />
              </Common>
            </SidebarProvider>
          </SocketProvider>
        </UserProvider>
      </CryptoProvider>
    </PageContext.Provider>
  );
}
