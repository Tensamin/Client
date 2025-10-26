"use client";

// Package Imports
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";

// Context Imports
import { useStorageContext } from "@/context/storage";
import { SocketProvider } from "@/context/socket";
import { UserProvider } from "@/context/user";
import { MessageProvider } from "@/context/message";
import { CryptoProvider } from "@/context/crypto";

// Pages
import LoginPage from "@/page/login";

// Components
import { Loading } from "@/components/loading";

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
  const [, startTransition] = useTransition();

  const { bypass } = useStorageContext();

  const setPage = useCallback(
    (page: string, data: string = "", extraData: string = "") => {
      if (bypass && page === "error") return;
      startTransition(() => {
        setPageRaw(page);
        setPageData(data);
        setExtraPageData(extraData);
      });
    },
    [bypass]
  );

  useEffect(() => {
    if (bypass && page === "error") {
      setPageRaw("home");
      setPageData("");
      setExtraPageData("");
    }
  }, [bypass, page]);

  const contextValues = {
    page,
    pageData,
    extraPageData,
    setPage,
  };

  if (page === "error" && !bypass)
    return (
      <Loading message={pageData || "ERROR"} extra={extraPageData || ""} />
    );

  if (page === "login")
    return (
      <PageContext.Provider value={contextValues}>
        <CryptoProvider>
          <LoginPage />
        </CryptoProvider>
      </PageContext.Provider>
    );

  return (
    <PageContext.Provider value={contextValues}>
      <CryptoProvider>
        <SocketProvider>
          <UserProvider>
            <MessageProvider>{children}</MessageProvider>
          </UserProvider>
        </SocketProvider>
      </CryptoProvider>
    </PageContext.Provider>
  );
}
