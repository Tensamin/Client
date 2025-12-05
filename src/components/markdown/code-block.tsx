"use client";

// Package Imports
import { useEffect, useState } from "react";
import { bundledLanguages, codeToHtml } from "shiki";
import DOMPurify from "dompurify";
import * as Icon from "lucide-react";

// Lib Imports
import { cn } from "@/lib/utils";

// Context Imports
import { useStorageContext } from "@/context/storage";

// Components
import { Button } from "@/components/ui/button";

// Main
const bundledLanguageSet = new Set(
  Object.keys(bundledLanguages).map((lang) => lang.toLowerCase())
);

interface CodeBlockProps {
  language: string;
  code: string;
  className?: string;
}

export function CodeBlock({ language, code, className }: CodeBlockProps) {
  const { data } = useStorageContext();
  const theme = (data.codeBlockShikiTheme as string) ?? "houston";
  const [html, setHtml] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const normalizedLanguage = (language || "text").toLowerCase();
    const resolvedLanguage = bundledLanguageSet.has(normalizedLanguage)
      ? normalizedLanguage
      : "text";

    const renderCode = async () => {
      try {
        const highlighted = await codeToHtml(code, {
          lang: resolvedLanguage,
          theme,
        });
        if (!cancelled) {
          const sanitized = DOMPurify.sanitize(highlighted, {
            USE_PROFILES: { html: true },
          });
          setHtml(sanitized);
        }
      } catch {
        const fallback = await codeToHtml(code, {
          lang: "text",
          theme,
        });
        if (!cancelled) {
          const sanitized = DOMPurify.sanitize(fallback, {
            USE_PROFILES: { html: true },
          });
          setHtml(sanitized);
        }
      }
    };

    renderCode();

    return () => {
      cancelled = true;
    };
  }, [code, language, theme]);

  const copyToClipboard = async () => {
    if (code) {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border bg-input/30 overflow-hidden my-1",
        className
      )}
    >
      <div className="flex items-center justify-between px-2 py-1.5 border-b bg-input/30">
        <span className="text-xs text-foreground font-medium pl-1">
          {language || "text"}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="w-6 h-6 rounded-sm"
          onClick={copyToClipboard}
        >
          {copied ? (
            <Icon.Check
              className="scale-75"
              color="var(--foreground)"
              strokeWidth={2}
            />
          ) : (
            <Icon.Copy
              className="scale-75"
              color="var(--foreground)"
              strokeWidth={3}
            />
          )}
        </Button>
      </div>
      <div className="overflow-x-auto [&>pre]:bg-transparent! [&>pre]:m-0! [&>pre]:p-0!">
        {html ? (
          <div
            dangerouslySetInnerHTML={{ __html: html }}
            className="text-sm font-mono *:p-2 focus:outline-none"
          />
        ) : (
          <pre className="text-sm font-mono text-foreground focus:outline-none">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
