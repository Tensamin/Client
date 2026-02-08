"use client";

import { markdownComponents } from "@/components/markdown/MarkdownComponents";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

type TextProps = {
  text: string;
  className?: string;
};

export function Text({ text, className }: TextProps) {
  return (
    <div className={cn("whitespace-pre-wrap", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export default Text;
