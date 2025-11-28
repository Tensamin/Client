"use client";

import { useState, useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import postcss from "postcss";
import type { editor } from "monaco-editor";

import { useStorageContext } from "@/context/storage";
import { Button } from "@/components/ui/button";

export function CodeEditor({
  text,
  onSubmit,
}: {
  text: string;
  onSubmit: (code: string) => void;
}) {
  const [code, setCode] = useState(text);
  const [showDiscardButtonRerenderKey, setShowDiscardButtonRerenderKey] =
    useState(0);
  const showDiscardButton = text !== code;
  useStorageContext();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const css = getComputedStyle(document.documentElement);

    monaco.editor.defineTheme("tensamin", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": css.getPropertyValue("--card").trim(),
        "editor.foreground": css.getPropertyValue("--card-foreground").trim(),
      },
    });

    monaco.editor.setTheme("tensamin");

    monaco.languages.css.cssDefaults.setOptions({
      validate: true,
      lint: {
        compatibleVendorPrefixes: "warning",
        vendorPrefix: "warning",
        duplicateProperties: "warning",
      },
    });
  };

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const monaco = monacoRef.current;
    const model = editorRef.current.getModel();
    if (!model) return;

    try {
      postcss.parse(code, { from: undefined });
      monaco.editor.setModelMarkers(model, "postcss", []);
    } catch (err: unknown) {
      if (!err) return;
      const typedErr = err as {
        line?: number;
        column?: number;
        message?: string;
        reason?: string;
      };
      const markers: editor.IMarkerData[] = [];

      let line = 1;
      let column = 1;

      if (typeof typedErr.line === "number") line = typedErr.line;
      if (typeof typedErr.column === "number") column = typedErr.column;

      markers.push({
        severity: monaco.MarkerSeverity.Error,
        message: typedErr.message || typedErr.reason || String(err),
        startLineNumber: line,
        startColumn: column,
        endLineNumber: line,
        endColumn: column + 1,
      });

      monaco.editor.setModelMarkers(model, "postcss", markers);
    }
  }, [code]);

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="h-full border">
        <Editor
          height="100%"
          defaultLanguage="css"
          value={code}
          key={showDiscardButtonRerenderKey}
          theme="vs-dark"
          onChange={(value) => setCode(value || "")}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            lineNumbers: "off",
            scrollBeyondLastLine: false,
            tabSize: 2,
          }}
        />
      </div>
      <div className="flex justify-end gap-2">
        {showDiscardButton && (
          <Button
            variant="outline"
            onClick={() => {
              setShowDiscardButtonRerenderKey((prev) => prev + 1);
              setCode(text);
            }}
          >
            {"Discard"}
          </Button>
        )}
        <Button onClick={() => onSubmit(code)}>{"Save"}</Button>
      </div>
    </div>
  );
}
