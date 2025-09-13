"use client";

// Package Imports
import { createContext, useContext, useState } from "react";

// Context Imports
import { CryptoProvider } from "@/context/crypto";
import { SocketProvider } from "@/context/socket";

// Components
import { Loading } from "@/components/loading";
import LoginPage from "@/page/login";
import HomePage from "@/page/home";

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

  function setPage(page: string, data: string = "") {
    setPageRaw(page);
    setPageData(data);
  }

  if (page === "error") return <Loading message={pageData || "ERROR"} />;

  function PageSwitch() {
    switch (page) {
      case "login":
        return <LoginPage />;
      case "home":
        return (
          <SocketProvider>
            <HomePage />
          </SocketProvider>
        );
      default:
        return <div>Unkown Page</div>;
    }
  }

  return (
    <PageContext.Provider value={{ page, pageData, setPage }}>
      <CryptoProvider>
        <PageSwitch />
      </CryptoProvider>
    </PageContext.Provider>
  );
}
