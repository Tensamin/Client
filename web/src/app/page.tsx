"use client";

import { usePageContext } from "@/context/page";
import { useEffect } from "react";

import { Loading } from "@/components/loading";

// Main
export default function Page() {
  const { setPage } = usePageContext();

  useEffect(() => {
    setPage("home");
  }, [setPage]);

  return <Loading progress={0} />;
}
