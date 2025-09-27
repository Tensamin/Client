import { useState, useRef } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useStorageContext } from "@/context/storage";
import * as Icon from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function Page() {
  const {
    languages,
    setLanguage,
    translate,
    addLanguage,
    removeLanguage,
    language,
  } = useStorageContext();
  const [hover, setHover] = useState(false);
  const [loading, setLoading] = useState(false);

  const tlFileRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    setHover(false);
    setLoading(true);
    const files = e.target.files;
    if (!files) return;
    if (files.length === 0) return;
    const file = files[0];

    try {
      const text = await file.text();
      addLang(text);
    } catch {
      toast.error(translate("ERROR_INVALID_TL_FILE"));
    }
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setHover(false);
    setLoading(true);
    const { files } = e.dataTransfer;
    if (files.length === 0) return;
    const file = files[0];

    try {
      const text = await file.text();
      addLang(text);
    } catch {
      toast.error(translate("ERROR_INVALID_TL_FILE"));
    }
  }

  async function addLang(rawFile: string) {
    setLoading(true);
    try {
      const tlFile = JSON.parse(rawFile);
      Object.keys(tlFile).map((langCode) => {
        if (
          Object.keys(tlFile[langCode]).length <
          Object.keys(languages["en_int"]).length
        ) {
          toast.warning(translate("LANGUAGE_PAGE_MISSING_TRANSLATIONS"));
        }
        addLanguage(langCode, tlFile[langCode]);
        setLanguage(langCode);
      });
    } catch {
      toast.error(translate("ERROR_LANGUAGE_PAGE_INVALID_TL_FILE"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex flex-col gap-4 h-full w-full z-10"
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
    >
      <input
        hidden
        type="file"
        accept=".tl"
        ref={tlFileRef}
        onChange={handleFileSelect}
      />
      <div className="flex">
        <Button
          onClick={() => {
            tlFileRef.current?.click();
          }}
          disabled={loading || hover}
        >
          {translate("LANGUAGE_PAGE_ADD_LANGUAGE_BUTTON")}
        </Button>
      </div>
      <Command className="border">
        {hover ? (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <Icon.ArrowDown />
          </div>
        ) : (
          <>
            <CommandInput
              placeholder={translate("LANGUAGE_PAGE_SEARCH_LANGUAGES")}
            />
            <CommandList>
              <CommandEmpty>
                {translate("LANGUAGE_PAGE_NO_LANGUAGE_FOUND")}
              </CommandEmpty>
              <CommandGroup>
                {Object.keys(languages).map((lang) => (
                  <CommandItem key={lang}>
                    <Checkbox
                      checked={lang === language}
                      id={lang}
                      onCheckedChange={(value) => {
                        if (value) setLanguage(lang);
                      }}
                    />
                    <Label htmlFor={lang}>
                      {languages[lang].GENERIC_NAME ||
                        translate("UNKOWN_LANGUAGE")}
                    </Label>
                    <p className="text-xs font-mono text-muted-foreground ml-auto">
                      {lang}
                    </p>
                    {lang !== "en_int" && (
                      <Badge
                        variant="destructive"
                        onClick={() => {
                          removeLanguage(lang);
                          setLanguage("en_int");
                        }}
                      >
                        {translate("DELETE")}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </>
        )}
      </Command>
    </div>
  );
}
