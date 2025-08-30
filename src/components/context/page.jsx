"use client";

// Package Imports
import React, { createContext, useContext, useEffect, useState } from "react";

// Context Imports
import { useMessageContext } from "@/components/context/message";
import ls from "@/lib/localStorageManager";

// Main
let PageContext = createContext();

// Use Context Function
export function usePageContext() {
  let context = useContext(PageContext);
  if (context === undefined) {
    throw new Error("usePageContext must be used within a PageProvider");
  }
  return context;
}

// Provider
export function PageProvider({ children }) {
  let [page, setPage] = useState({ name: "home", data: "" });
  let [sidebarCategory, setActualSidebarCategory] = useState(
    ls.get("layout_sidebar_category") || "chats",
  );
  let { resetReceiver } = useMessageContext();

  function setSidebarCategory(newCategory) {
    if (ls.get("layout_sidebar_category_policy") || "last" === "last")
      ls.set("layout_sidebar_category", newCategory);
    setActualSidebarCategory(newCategory);
  }

  useEffect(() => {
    if (page.name !== "chat") {
      resetReceiver("");
    }
  }, [page]);

  return (
    <PageContext.Provider
      value={{
        page,
        setPage,
        sidebarCategory,
        setSidebarCategory,
      }}
    >
      {children}
    </PageContext.Provider>
  );
}
