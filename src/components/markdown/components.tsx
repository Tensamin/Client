import React from "react";
import Link from "next/link";
import type { Components } from "react-markdown";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type HProps = React.HTMLAttributes<HTMLHeadingElement>;
type PProps = React.HTMLAttributes<HTMLParagraphElement>;
type AProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;
type QProps = React.HTMLAttributes<HTMLQuoteElement>;
type UlProps = React.HTMLAttributes<HTMLUListElement>;
type OlProps = React.HTMLAttributes<HTMLOListElement>;
type LiProps = React.LiHTMLAttributes<HTMLLIElement>;
type PreProps = React.HTMLAttributes<HTMLPreElement>;
type CodeProps = React.HTMLAttributes<HTMLElement> & {
  inline?: boolean;
};
type HrProps = React.HTMLAttributes<HTMLHRElement>;
type ImgProps = React.ImgHTMLAttributes<HTMLImageElement>;
type EmProps = React.HTMLAttributes<HTMLElement>;
type StrongProps = React.HTMLAttributes<HTMLElement>;

export const H1 = ({ className, ...props }: HProps) => (
  <h1
    className={`mt-10 scroll-m-20 text-xl font-bold tracking-tight ${
      className ?? ""
    }`}
    {...props}
  />
);

export const H2 = ({ className, ...props }: HProps) => (
  <h2
    className={`mt-8 scroll-m-20 text-lg font-semibold tracking-tight ${
      className ?? ""
    }`}
    {...props}
  />
);

export const H3 = ({ className, ...props }: HProps) => (
  <h3
    className={`mt-6 scroll-m-20 text-md font-semibold tracking-tight ${
      className ?? ""
    }`}
    {...props}
  />
);

export const H4 = ({ className, ...props }: HProps) => (
  <h4
    className={`mt-4 scroll-m-20 text-sm font-semibold tracking-tight ${
      className ?? ""
    }`}
    {...props}
  />
);

export const P = ({ className, ...props }: PProps) => (
  <p
    className={`leading-7 [&:not(:first-child)]:mt-6 ${className ?? ""}`}
    {...props}
  />
);

export const A = ({ className, href = "", ...props }: AProps) => {
  const isExternal = /^https?:\/\//.test(href);
  return (
    <Link
      href={href}
      className={`text-primary underline underline-offset-4 hover:opacity-90 ${
        className ?? ""
      }`}
      {...(isExternal ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      {...props}
    />
  );
};

export const Blockquote = ({ className, ...props }: QProps) => (
  <blockquote
    className={`mt-6 border-l-4 pl-4 italic text-muted-foreground ${
      className ?? ""
    }`}
    {...props}
  />
);

export const UL = ({ className, ...props }: UlProps) => (
  <ul className={`my-6 ml-6 list-disc ${className ?? ""}`} {...props} />
);

export const OL = ({ className, ...props }: OlProps) => (
  <ol className={`my-6 ml-6 list-decimal ${className ?? ""}`} {...props} />
);

export const LI = ({ className, ...props }: LiProps) => (
  <li
    className={`my-1 marker:text-muted-foreground ${className ?? ""}`}
    {...props}
  />
);

export const HR = ({ className, ...props }: HrProps) => (
  <hr className={`my-6 border-t ${className ?? ""}`} {...props} />
);

export const Img = ({ className, alt, ...props }: ImgProps) => (
  // If you prefer next/image, replace with <Image ... fill/width/height />
  <img
    alt={alt ?? ""}
    className={`my-4 max-w-full rounded-md border ${className ?? ""}`}
    {...props}
  />
);

export const TableComponent = ({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) => (
  <Table className={`my-6 w-full ${className ?? ""}`} {...props} />
);

export const Strong = ({ className, ...props }: StrongProps) => (
  <strong className={`font-semibold ${className ?? ""}`} {...props} />
);

export const Em = ({ className, ...props }: EmProps) => (
  <em className={`italic ${className ?? ""}`} {...props} />
);

export const Pre = ({ className, ...props }: PreProps) => (
  <pre
    className={`my-6 overflow-x-auto rounded-lg border bg-muted p-4 ${
      className ?? ""
    }`}
    {...props}
  />
);

export const Code = ({ inline, className, children, ...props }: CodeProps) =>
  inline ? (
    <code
      className={`relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm ${
        className ?? ""
      }`}
      {...props}
    >
      {children}
    </code>
  ) : (
    <Pre className={className}>
      <code className="font-mono text-sm" {...props}>
        {children}
      </code>
    </Pre>
  );

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
  code: Code,
};
