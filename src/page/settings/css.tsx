"use client";

// Context Imports
import { useStorageContext } from "@/context/storage";

// Components
import { CodeEditor } from "@/components/code";

// Main
export default function Page() {
  const {
    setThemeCSS,
    data: { themeCSS },
  } = useStorageContext();
  return (
    <div className="flex flex-col gap-2 h-full w-[97%]">
      <CodeEditor
        text={themeCSS as string}
        onSubmit={(value) => {
          setThemeCSS(value);
        }}
      />
    </div>
  );
}
