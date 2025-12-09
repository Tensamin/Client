"use client";

import { useState, useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import postcss from "postcss";
import type { editor } from "monaco-editor";

import { useStorageContext } from "@/context/storage";
import { Button } from "@/components/ui/button";

function labToHex(labColor: string): string {
  // Parse LAB string
  const match = labColor.match(/lab\(([\d.]+)%\s+([\d.-]+)\s+([\d.-]+)\)/);
  if (!match) throw new Error("Invalid LAB format");

  const L = (parseFloat(match[1]) / 100) * 100;
  const a = parseFloat(match[2]);
  const b = parseFloat(match[3]);

  // LAB to XYZ
  const fx = (L + 16) / 116;
  const fy = a / 500 + fx;
  const fz = fx - b / 200;

  const xr = fy * fy * fy > 0.008856 ? fy * fy * fy : (fy - 16 / 116) / 7.787;
  const yr = L > 8 ? ((L + 16) / 116) ** 3 : L / 903.3;
  const zr = fz * fz * fz > 0.008856 ? fz * fz * fz : (fz - 16 / 116) / 7.787;

  const x = xr * 0.95047;
  const y = yr * 1.0;
  const z = zr * 1.08883;

  // XYZ to RGB
  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let b_val = x * 0.0557 + y * -0.204 + z * 1.057;

  // Gamma correction
  r = r > 0.0031308 ? 1.055 * r ** (1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * g ** (1 / 2.4) - 0.055 : 12.92 * g;
  b_val =
    b_val > 0.0031308 ? 1.055 * b_val ** (1 / 2.4) - 0.055 : 12.92 * b_val;

  // RGB to Hex
  const toHex = (val: number) =>
    Math.round(Math.max(0, Math.min(255, val * 255)))
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b_val)}`;
}

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
        "editor.background": labToHex(css.getPropertyValue("--card").trim()),
        "editor.foreground": labToHex(
          css.getPropertyValue("--card-foreground").trim(),
        ),
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
