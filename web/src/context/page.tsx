"use client";

// Package Imports
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

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
  const [initalLoadDone, setInitialLoadDone] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const segments = pathname.split("/").filter((seg) => seg.length > 0);
    if (segments.length < 2) return;

    const pageName = segments[2]
      ? `${segments[1]}/${segments[2]}`
      : segments[1];
    setPageRaw(pageName);
  }, [pathname]);

  const setPage = useCallback(
    async (page: string, data?: string) => {
      let base = "z";

      if (page === "error" || page === "login" || page === "signup") {
        base = "y";
      }

      router.push(`/${base}/${page}`);
      if (data) {
        setPageData(data);
      }
      setErrorMessage("");
      setErrorDescription("");
    },
    [router]
  );

  const setError = (message: string, description: string) => {
    router.push("/y/error");
    setPageData("");
    setErrorMessage(message);
    setErrorDescription(description);
  };

  // Initial load
  useEffect(() => {
    if (initalLoadDone) return;
    setInitialLoadDone(true);
    setPage("home");
  }, [initalLoadDone, setPage]);

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
