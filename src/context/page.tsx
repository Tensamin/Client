"use client";

// Package Imports
import { createContext, useContext, useState } from "react";

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

  function setPage(page: string, data: string = "", extraData: string = "") {
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
