"use client";

// Package Imports
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

// Context Imports
import { useMessageContext } from "@/components/context/message";

// Main
let PageContext = createContext();

// Use Context Function
export function usePageContext() {
    let context = useContext(PageContext);
    if (context === undefined) {
        throw new Error(
            "usePageContext must be used within a PageProvider",
        );
    }
    return context;
}

// Provider
export function PageProvider({ children }) {
    let [page, setPage] = useState({name: "home", data: ""});
    let { resetReceiver } = useMessageContext()

    useEffect(() => {
        if (page.name !== "chat") {
            resetReceiver("")
        }
    }, [page])

    return (
        <PageContext.Provider
            value={{
                page,
                setPage,
            }}
        >
            {children}
        </PageContext.Provider>
    );
}