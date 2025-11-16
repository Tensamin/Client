// Package Imports
import React from "react";
import Link from "next/link";
import type { Components } from "react-markdown";
import * as Icon from "lucide-react";

// Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Types
type HProps = React.HTMLAttributes<HTMLHeadingElement>;
type PProps = React.HTMLAttributes<HTMLParagraphElement>;
type AProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;
type QProps = React.HTMLAttributes<HTMLQuoteElement>;
type UlProps = React.HTMLAttributes<HTMLUListElement>;
type OlProps = React.HTMLAttributes<HTMLOListElement>;
type LiProps = React.LiHTMLAttributes<HTMLLIElement>;
type PreProps = React.HTMLAttributes<HTMLPreElement>;
type HrProps = React.HTMLAttributes<HTMLHRElement>;
type ImgProps = React.ImgHTMLAttributes<HTMLImageElement>;
type EmProps = React.HTMLAttributes<HTMLElement>;
type StrongProps = React.HTMLAttributes<HTMLElement>;

// Main
export const H1 = ({ className, ...props }: HProps) => {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
        className
      )}
      {...props}
    />
  );
};

export const H2 = ({ className, ...props }: HProps) => {
  return (
    <h2
      className={cn(
        "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
        className
      )}
      {...props}
    />
  );
};

export const H3 = ({ className, ...props }: HProps) => {
  return (
    <h3
      className={cn(
        "scroll-m-20 text-2xl font-semibold tracking-tight",
        className
      )}
      {...props}
    />
  );
};

export const H4 = ({ className, ...props }: HProps) => {
  return (
    <h4
      className={cn(
        "scroll-m-20 text-xl font-semibold tracking-tight",
        className
      )}
      {...props}
    />
  );
};

export const P = ({ className, ...props }: PProps) => {
  return <p className={cn("leading-6 not-first:mt-6", className)} {...props} />;
};

export const A = ({ href = "", className, ...props }: AProps) => {
  const isExternal = /^https?:\/\//.test(href);
  return (
    <Link
      href={href}
      className={cn(
        "font-medium text-primary underline underline-offset-4",
        className
      )}
      {...(isExternal ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      {...props}
    />
  );
};

export const Blockquote = ({ className, ...props }: QProps) => {
  return (
    <blockquote
      className={cn(
        "mt-6 border-l-2 pl-6 italic text-muted-foreground",
        className
      )}
      {...props}
    />
  );
};

export const UL = ({ className, ...props }: UlProps) => {
  return (
    <ul
      className={cn("my-6 ml-6 list-disc [&>li]:mt-2", className)}
      {...props}
    />
  );
};

export const OL = ({ className, ...props }: OlProps) => {
  return (
    <ol
      className={cn("my-6 ml-6 list-decimal [&>li]:mt-2", className)}
      {...props}
    />
  );
};

export const LI = ({ className, ...props }: LiProps) => {
  return <li className={cn("mt-2", className)} {...props} />;
};

export const HR = ({ className, ...props }: HrProps) => {
  return <hr className={cn("my-4 border-muted", className)} {...props} />;
};

export const Img = ({ className, alt, src, ...props }: ImgProps) => {
  const isBase64 =
    typeof src === "string" && /^data:image\/[a-z0-9.+-]+;base64,/i.test(src);

  if (src && !isBase64) {
    return null;
  }

  if (!src) {
    return null;
  }

  return (
    // eslint-disable-next-line
    <img
      src={src}
      alt={alt ?? ""}
      className={cn(
        "my-4 h-auto max-w-full rounded-md border border-border object-cover",
        className
      )}
      {...props}
    />
  );
};

export const TableComponent = ({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) => {
  return (
    <Table
      className={cn("my-6 w-full overflow-hidden rounded-md border", className)}
      {...props}
    />
  );
};

export const Strong = ({ className, ...props }: StrongProps) => {
  return <strong className={cn("font-semibold", className)} {...props} />;
};

export const Em = ({ className, ...props }: EmProps) => {
  return <em className={cn("italic", className)} {...props} />;
};

export const Pre = ({ className, ...props }: PreProps) => {
  return (
    <pre
      className={cn(
        "mb-4 mt-6 overflow-x-auto rounded-lg border bg-muted p-4",
        className
      )}
      {...props}
    />
  );
};

export const markdownComponents: Components = {
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  p: P,
  a: A,
  blockquote: Blockquote,
  ul: UL,
  ol: OL,
  li: LI,
  hr: HR,
  img: Img,
  table: TableComponent,
  thead: TableHeader,
  tbody: TableBody,
  tr: TableRow,
  th: TableHead,
  td: TableCell,
  strong: Strong,
  em: Em,
  code: ({ className, children }) => {
    const languageToken = className?.split(" ")[1]?.replace("language-", "");
    return (
      <div className={cn("flex flex-col p-1 rounded-lg border", className)}>
        <div className="flex gap-1 items-center">
          <Button size="icon" variant="ghost" className="w-6 h-6 rounded-sm">
            <Icon.Copy
              className="scale-75"
              color="var(--muted-foreground)"
              strokeWidth={2}
            />
          </Button>
          {languageToken ? (
            <span className="text-xs text-muted-foreground">
              {languageToken}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">WEEWOO</span>
          )}
        </div>
        <code className="text-xs p-1 overflow-scroll scrollbar-hide">
          {children}
        </code>
      </div>
    );
  },
};
