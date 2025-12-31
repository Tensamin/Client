"use client";

// Package Imports
import { useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";

// Main
type PageContextType = {
  errorMessage: string;
  errorDescription: string;
  page: string;
  pageData: string;
  setPage: (page: string, data?: string) => void;
  setError: (message: string, description: string) => void;
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
  const [errorMessage, setErrorMessage] = useState("");
  const [errorDescription, setErrorDescription] = useState("");

  const router = useRouter();

  const setPage = async (page: string, data?: string) => {
    let base = "z";

    if (page === "error" || page === "login" || page === "signup") {
      base = "y";
    }

    router.push(`/${base}/${page}`);

    setPageRaw(page);
    setPageData(data ?? "");
    setErrorMessage("");
    setErrorDescription("");
  };

  const setError = (message: string, description: string) => {
    setPageRaw("error");
    setPageData("");
    setErrorMessage(message);
    setErrorDescription(description);
  };

  return (
    <PageContext.Provider
      value={{
        errorMessage,
        errorDescription,
        page,
        pageData,
        setPage,
        setError,
      }}
    >
      {children}
    </PageContext.Provider>
  );
}
