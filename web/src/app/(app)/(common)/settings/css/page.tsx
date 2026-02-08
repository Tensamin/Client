"use client";

// Context Imports
import { useStorageContext } from "@/context/StorageContext";

// Components
import { CodeEditor } from "@/components/CssEditor";
import { Top } from "../page";

// Main
export default function Page() {
  const {
    setThemeCSS,
    data: { themeCSS },
  } = useStorageContext();
  return (
    <Top text="Custom CSS">
      <div className="flex flex-col gap-2 h-full md:w-[95%]">
        <CodeEditor
          text={themeCSS as string}
          onSubmit={(value) => {
            setThemeCSS(value);
          }}
        />
      </div>
    </Top>
  );
}
