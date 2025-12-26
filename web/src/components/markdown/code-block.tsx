"use client";

// Package Imports
import * as Icon from "lucide-react";
import { useState } from "react";
import { ShikiHighlighter } from "react-shiki";

// Context Imports
import { useStorageContext } from "@/context/storage";
import { defaults } from "@/lib/defaults";
import { mono } from "@/lib/fonts";
import { Button } from "../ui/button";

// Main
export function CodeBlock({
  language,
  children,
  inline,
}: {
  language: string;
  children: string;
  inline: boolean;
}) {
  const { data } = useStorageContext();
  const [copied, setCopied] = useState(false);
  const copyCode = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return inline ? (
    <code
      onClick={copyCode}
      className={`px-1.5 py-0.5 rounded-sm ${
        copied ? "bg-primary/20" : "bg-input/40"
      } transition-all duration-250 ease-in-out ${mono.className}`}
    >
      {children}
    </code>
  ) : (
    <div className="flex flex-col rounded-xl border overflow-hidden">
      <div className="flex justify-between bg-card items-center p-0.5">
        <p className="pl-2 text-[14px]">{language}</p>
        <Button size="sm" variant="ghost" onClick={copyCode}>
          {copied ? <Icon.Check /> : <Icon.Clipboard />}
        </Button>
      </div>
      <ShikiHighlighter
        className={`${mono.className} bg-input/15`}
        rootStyle="padding: 12px;"
        showLanguage={false}
        showLineNumbers={
          (data.showLinesInCodeBlocks as boolean) ??
          defaults.showLinesInCodeBlocks
        }
        language={language}
        theme={(data.codeBlockShikiTheme as string) ?? defaults.codeBlockShikiTheme}
      >
        {children}
      </ShikiHighlighter>
    </div>
  );
}
