"use client";

// Package Imports
import { createContext, useContext, useState, useEffect } from "react";

// Main
type StorageContextType = {
  set: (key: string, value: any) => void;
  data: { [key: string]: any };
  rerender: (value: boolean) => void;
};

const StorageContext = createContext<StorageContextType | null>(null);

export function useStorageContext() {
  const context = useContext(StorageContext);
  if (!context)
    throw new Error("useContext function used outside of its provider");
  return context;
}

export function StorageProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [data, setData] = useState({});
  const [, rerender] = useState(false);
  const [ready, setReady] = useState(false);

  function set(key: string, value: any) {
    let newData: any = data;
    if (value === false) {
      delete newData[key];
    } else {
      newData[key] = value;
    }
    rerender((prev) => !prev);
    setData(newData);
    const stringRawData = JSON.stringify(newData);
    const base64Data = btoa(stringRawData);
    localStorage.setItem("data", base64Data);
  }

  useEffect(() => {
    let mounted = true;
    if (!mounted) return;
    setReady(true);
    const storedRawData = localStorage.getItem("data");
    if (storedRawData) {
      try {
        const stringRawData = atob(storedRawData);
        const parsedRawData = JSON.parse(stringRawData);
        setData(parsedRawData);
      } catch (error) {
        console.error("Failed to parse stored raw data:", error);
      }
    }
    return () => {
      mounted = false;
    };
  }, []);

  return ready ? (
    <StorageContext.Provider
      value={{
        set,
        data,
        rerender,
      }}
    >
      {children}
    </StorageContext.Provider>
  ) : null;
}
