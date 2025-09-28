"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { markdownComponents } from "@/components/markdown/components";

type TextProps = {
  text: string;
  className?: string;
};

export function Text({ text, className }: TextProps) {
  return (
    <div className={className ?? "prose prose-zinc dark:prose-invert"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
