"use client";

// Package Imports
import { useState } from "react";
import { toast } from "sonner";

// Context Imports
import { useStorageContext } from "@/context/storage";

// Components
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Main
export default function Page() {
  const {
    setThemeCSS,
    translate,
    data: { themeCSS },
  } = useStorageContext();
  const [tempThemeCSS, setTempThemeCSS] = useState(themeCSS as string);
  const [discardRerender, setDiscardRerender] = useState(0);
  const showDiscardButton = tempThemeCSS !== (themeCSS as string);
  return (
    <div className="flex flex-col gap-2 h-full">
      <Textarea
        className="h-full font-mono resize-none"
        placeholder={`* {\n  color: #000;\n}`}
        spellCheck={false}
        key={discardRerender}
        value={tempThemeCSS}
        onChange={(value) => {
          setTempThemeCSS(value.target.value);
        }}
      />
      <div className="flex gap-2 w-full justify-end">
        {showDiscardButton && (
          <Button
            className="w-auto"
            variant="outline"
            onClick={() => {
              setTempThemeCSS(themeCSS as string);
              setDiscardRerender(discardRerender + 1);
            }}
          >
            {translate("DISCARD")}
          </Button>
        )}
        <Button
          className="w-auto"
          onClick={() => {
            setThemeCSS(tempThemeCSS);
            toast.success(translate("SETTINGS_CSS_SAVED"));
          }}
        >
          {translate("SAVE")}
        </Button>
      </div>
    </div>
  );
}
