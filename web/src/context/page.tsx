"use client";

// Package Imports
import { useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";

// Main
type PageContextType = {
  errorMessage: string;
  errorDescription: string;
  setError: (message: string, description: string) => void;
};

const PageContext = createContext<PageContextType | null>(null);

export function usePageContext() {
  const context = useContext(PageContext);
  if (!context) throw new Error("hook outside of provider");
  return context;
}

export function PageProvider({ children }: { children: React.ReactNode }) {
  const [errorMessage, setErrorMessage] = useState("");
  const [errorDescription, setErrorDescription] = useState("");

  const router = useRouter();

  const setError = (message: string, description: string) => {
    router.push("/error");
    setErrorMessage(message);
    setErrorDescription(description);
  };

  return (
    <PageContext.Provider
      value={{
        errorMessage,
        errorDescription,
        setError,
      }}
    >
      {children}
    </PageContext.Provider>
  );
}
