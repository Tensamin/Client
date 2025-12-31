"use client";

import { Loading } from "@/components/loading";
import { usePageContext } from "@/context/page";

export default function Page() {
  const { errorMessage, errorDescription } = usePageContext();

  return (
    <Loading
      message={errorMessage}
      extra={errorDescription}
      isError
      progress={100}
    />
  );
}
