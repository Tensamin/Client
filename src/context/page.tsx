"use client";

// Package Imports
import { createContext, useContext, useState } from "react";

// Context Imports
import { useStorageContext } from "@/context/storage";

// Main
type PageContextType = {
  page: string;
  pageData: string;
  extraPageData: string;
  setPage: (page: string, data?: string, extraData?: string) => void;
};

const PageContext = createContext<PageContextType | null>(null);

export function usePageContext() {
  const context = useContext(PageContext);
  if (!context) throw new Error("hook outside of provider");
  return context;
}

export function PageProvider({ children }: { children: React.ReactNode }) {
  const [page, setPageRaw] = useState("home");
  const [pageData, setPageData] = useState("");
  const [extraPageData, setExtraPageData] = useState("");

  const { bypass } = useStorageContext();

  function setPage(page: string, data: string = "", extraData: string = "") {
    if (bypass && page === "error") return;
    setPageRaw(page);
    setPageData(data);
    setExtraPageData(extraData);
  }

  return (
    <PageContext.Provider
      value={{
        page,
        pageData,
        extraPageData,
        setPage,
      }}
    >
      {children}
    </PageContext.Provider>
  );
}
