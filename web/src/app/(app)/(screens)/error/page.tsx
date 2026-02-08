"use client";

import { default as Loading } from "@/components/Loading/LoadingScreen";
import { usePageContext } from "@/context/PageContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const { errorMessage, errorDescription } = usePageContext();
  const router = useRouter();

  useEffect(() => {
    if (!errorMessage) {
      router.replace("/");
    }
  }, [errorMessage, router]);

  return errorMessage ? (
    <Loading
      message={errorMessage}
      extra={errorDescription}
      isError
      progress={100}
    />
  ) : null;
}
