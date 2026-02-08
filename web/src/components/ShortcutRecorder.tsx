"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ShortcutRecorderProps {
  value: string;
  onChange: (accelerator: string) => void;
  disabled?: boolean;
  className?: string;
}

function keyEventToAccelerator(e: KeyboardEvent): string | null {
  const parts: string[] = [];

  // Modifiers
  if (e.ctrlKey || e.metaKey) {
    parts.push("CmdOrCtrl");
  }
  if (e.altKey) {
    parts.push("Alt");
  }
  if (e.shiftKey) {
    parts.push("Shift");
  }

  // Key - ignore if only modifier key pressed
  const key = e.key;
  const ignoredKeys = [
    "Control",
    "Meta",
    "Alt",
    "Shift",
    "CapsLock",
    "Tab",
    "Escape",
  ];
  if (ignoredKeys.includes(key)) {
    return null;
  }

  // Convert key to Electron format
  let keyName = key;

  // Handle special keys
  if (key === " ") keyName = "Space";
  else if (key === "ArrowUp") keyName = "Up";
  else if (key === "ArrowDown") keyName = "Down";
  else if (key === "ArrowLeft") keyName = "Left";
  else if (key === "ArrowRight") keyName = "Right";
  else if (key === "Enter") keyName = "Enter";
  else if (key === "Backspace") keyName = "Backspace";
  else if (key === "Delete") keyName = "Delete";
  else if (key === "Home") keyName = "Home";
  else if (key === "End") keyName = "End";
  else if (key === "PageUp") keyName = "PageUp";
  else if (key === "PageDown") keyName = "PageDown";
  else if (key === "Insert") keyName = "Insert";
  else if (key.startsWith("F") && /^F\d+$/.test(key)) keyName = key; // F1-F12
  else if (key.length === 1) keyName = key.toUpperCase(); // Single characters

  parts.push(keyName);

  // Must have at least one modifier for a valid shortcut
  if (parts.length < 2) {
    return null;
  }

  return parts.join("+");
}

function acceleratorToDisplay(accelerator: string): string[] {
  if (!accelerator) return [];

  return accelerator.split("+").map((part) => {
    if (part === "CmdOrCtrl") return navigator.platform.includes("Mac") ? "⌘" : "Ctrl";
    if (part === "Alt") return navigator.platform.includes("Mac") ? "⌥" : "Alt";
    if (part === "Shift") return navigator.platform.includes("Mac") ? "⇧" : "Shift";
    if (part === "Space") return "␣";
    return part;
  });
}

export function ShortcutRecorder({
  value,
  onChange,
  disabled = false,
  className,
}: ShortcutRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [tempKeys, setTempKeys] = useState<string[]>([]);
  const inputRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isRecording || disabled) return;

      e.preventDefault();
      e.stopPropagation();

      const accelerator = keyEventToAccelerator(e);
      if (accelerator) {
        onChange(accelerator);
        setIsRecording(false);
        setTempKeys([]);
        inputRef.current?.blur();
      } else {
        // Show current modifiers being held
        const parts: string[] = [];
        if (e.ctrlKey || e.metaKey) parts.push("CmdOrCtrl");
        if (e.altKey) parts.push("Alt");
        if (e.shiftKey) parts.push("Shift");
        setTempKeys(parts);
      }
    },
    [isRecording, disabled, onChange],
  );

  const handleKeyUp = useCallback(() => {
    if (isRecording) {
      setTempKeys([]);
    }
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }
  }, [isRecording, handleKeyDown, handleKeyUp]);

  const handleFocus = () => {
    if (!disabled) {
      setIsRecording(true);
    }
  };

  const handleBlur = () => {
    setIsRecording(false);
    setTempKeys([]);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const displayKeys = isRecording
    ? tempKeys.length > 0
      ? acceleratorToDisplay(tempKeys.join("+"))
      : []
    : acceleratorToDisplay(value);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        ref={inputRef}
        tabIndex={disabled ? -1 : 0}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          "flex items-center gap-1 min-w-35 h-9 px-3 py-1 rounded-md border bg-background text-sm transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          disabled && "opacity-50 cursor-not-allowed",
          isRecording && "border-primary ring-2 ring-primary/20",
          !disabled && !isRecording && "cursor-pointer hover:bg-accent",
        )}
      >
        {isRecording && displayKeys.length === 0 ? (
          <span className="text-muted-foreground text-xs">
            Press a key combination...
          </span>
        ) : displayKeys.length > 0 ? (
          displayKeys.map((key, i) => (
            <kbd
              key={i}
              className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded border border-border"
            >
              {key}
            </kbd>
          ))
        ) : (
          <span className="text-muted-foreground text-xs">Click to set</span>
        )}
      </div>
      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface ShortcutDisplayProps {
  accelerator?: string;
  action: string;
  className?: string;
}

export function ShortcutCliDisplay({
  action,
  className,
}: ShortcutDisplayProps) {
  const [copied, setCopied] = useState(false);
  const command = `tensamin --shortcut ${action}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = command;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <code className="flex-1 px-3 py-1.5 text-sm font-mono bg-muted rounded border border-border">
        {command}
      </code>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="shrink-0"
      >
        {copied ? "Copied!" : "Copy"}
      </Button>
    </div>
  );
}
